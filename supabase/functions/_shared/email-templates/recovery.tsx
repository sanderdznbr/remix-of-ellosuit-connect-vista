/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefina sua senha do {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>ellocontent</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Redefinir sua senha</Heading>
          <Text style={text}>
            Recebemos uma solicitação para redefinir a senha da sua conta no{' '}
            {siteName}. Clique no botão abaixo para escolher uma nova senha.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Redefinir senha
          </Button>
          <Text style={footer}>
            Se você não solicitou a redefinição, pode ignorar este e-mail com
            segurança. Sua senha não será alterada.
          </Text>
        </Section>
        <Text style={signature}>— Equipe ellocontent</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  margin: 0,
  padding: '40px 20px',
}
const container = { maxWidth: '520px', margin: '0 auto' }
const header = { padding: '0 0 24px', textAlign: 'center' as const }
const brand = {
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#5B00FF',
  letterSpacing: '-0.02em',
  margin: 0,
}
const card = {
  backgroundColor: '#fafafa',
  borderRadius: '16px',
  padding: '40px 32px',
  border: '1px solid #eeeeee',
}
const h1 = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#0a0a0a',
  letterSpacing: '-0.02em',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#52525b',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const button = {
  backgroundColor: '#5B00FF',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '13px',
  color: '#999999',
  lineHeight: '1.5',
  margin: '32px 0 0',
}
const signature = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '24px 0 0',
}
