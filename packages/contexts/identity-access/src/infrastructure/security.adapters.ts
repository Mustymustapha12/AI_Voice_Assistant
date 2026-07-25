import { createSecretKey, randomUUID } from 'node:crypto';

import * as argon2 from 'argon2';
import { jwtVerify, SignJWT } from 'jose';
import { createTransport, type Transporter } from 'nodemailer';

import type {
  AccessTokenService,
  PasswordHasher,
  TransactionalEmail,
} from '../application/ports.js';
import type { IdentityUser } from '../domain/model.js';

export interface JwtConfiguration {
  readonly audience: string;
  readonly issuer: string;
  readonly secret: string;
  readonly ttlSeconds: number;
}

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$sWnS/L8uWKyQ8nTfaeVBJw$jUZtexhnGGo8F03UhPysvAPU7kwz8PchksEmUoUJ0/U';

export class ArgonPasswordHasher implements PasswordHasher {
  public async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      memoryCost: 65_536,
      parallelism: 1,
      timeCost: 3,
      type: argon2.argon2id,
    });
  }

  public async verify(hash: string | null, password: string): Promise<boolean> {
    try {
      const verified = await argon2.verify(hash ?? DUMMY_PASSWORD_HASH, password);
      return hash !== null && verified;
    } catch {
      return false;
    }
  }
}

export class JoseAccessTokenService implements AccessTokenService {
  private readonly key: ReturnType<typeof createSecretKey>;

  public constructor(private readonly configuration: JwtConfiguration) {
    const secret = Buffer.from(configuration.secret, 'base64');
    if (secret.byteLength < 32) {
      throw new Error('AUTH_JWT_SECRET must be base64-encoded and at least 256 bits.');
    }
    this.key = createSecretKey(secret);
  }

  public async issue(user: IdentityUser, sessionId: string): Promise<string> {
    return new SignJWT({
      role: user.role,
      sid: sessionId,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(this.configuration.issuer)
      .setAudience(this.configuration.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.configuration.ttlSeconds}s`)
      .setJti(randomUUID())
      .sign(this.key);
  }

  public async verify(token: string): Promise<{
    readonly sessionId: string;
    readonly userId: string;
  }> {
    const result = await jwtVerify(token, this.key, {
      algorithms: ['HS256'],
      audience: this.configuration.audience,
      issuer: this.configuration.issuer,
    });
    if (typeof result.payload.sub !== 'string' || typeof result.payload.sid !== 'string') {
      throw new Error('Invalid access token claims.');
    }
    return {
      sessionId: result.payload.sid,
      userId: result.payload.sub,
    };
  }
}

export interface SmtpConfiguration {
  readonly from: string | undefined;
  readonly host: string | undefined;
  readonly password: string | undefined;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string | undefined;
}

export class SmtpTransactionalEmail implements TransactionalEmail {
  private readonly transporter: Transporter | null;

  public constructor(private readonly configuration: SmtpConfiguration) {
    this.transporter =
      configuration.host === undefined
        ? null
        : createTransport({
            host: configuration.host,
            port: configuration.port,
            secure: configuration.secure,
            ...(configuration.user === undefined
              ? {}
              : {
                  auth: {
                    pass: configuration.password,
                    user: configuration.user,
                  },
                }),
          });
  }

  public async sendAdminInvitation(input: {
    readonly displayName: string;
    readonly email: string;
    readonly verificationUrl: string;
  }): Promise<void> {
    await this.send({
      subject: 'Activate your AI Voice Commerce admin account',
      text: `Hello ${input.displayName},\n\nActivate your account and set your password:\n${input.verificationUrl}\n\nIf you did not expect this invitation, ignore this email.`,
      to: input.email,
    });
  }

  public async sendPasswordReset(input: {
    readonly displayName: string;
    readonly email: string;
    readonly resetUrl: string;
  }): Promise<void> {
    await this.send({
      subject: 'Reset your AI Voice Commerce password',
      text: `Hello ${input.displayName},\n\nReset your password:\n${input.resetUrl}\n\nIf you did not request this, ignore this email.`,
      to: input.email,
    });
  }

  private async send(message: {
    readonly subject: string;
    readonly text: string;
    readonly to: string;
  }): Promise<void> {
    if (this.transporter === null || this.configuration.from === undefined) {
      throw new Error('SMTP delivery is not configured.');
    }
    await this.transporter.sendMail({
      from: this.configuration.from,
      subject: message.subject,
      text: message.text,
      to: message.to,
    });
  }
}
