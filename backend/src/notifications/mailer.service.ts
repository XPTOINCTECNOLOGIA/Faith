import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/** Canal e-mail (RN-021). Sem SMTP_HOST configurado, degrada para log — as
 *  notificações internas continuam funcionando. */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transport: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('SMTP_FROM') ?? 'portal-oportunidades@xptoinc.com.br';
    this.transport = host
      ? nodemailer.createTransport({
          host,
          port: Number(config.get('SMTP_PORT') ?? 587),
          auth: config.get('SMTP_USER')
            ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASS') }
            : undefined,
        })
      : null;
  }

  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.transport) {
      this.logger.debug(`SMTP não configurado — e-mail suprimido: ${to} | ${subject}`);
      return false;
    }
    await this.transport.sendMail({ from: this.from, to, subject, text });
    return true;
  }
}
