/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação ellocontent</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>ellocontent</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirme sua identidade</Heading>
          <Text style={text}>
            Use o código abaixo para confirmar sua identidade:
          </Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            Este código expira em poucos minutos. Se você não solicitou,
            ignore este e-mail.
          </Text>
        </Section>
        <Text style={signature}>— Equipe ellocontent</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
  margin: '0 0 16px',
}
const codeStyle = {
  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
  fontSize: '32px',
  fontWeight: '700' as const,
  color: '#5B00FF',
  letterSpacing: '0.3em',
  textAlign: 'center' as const,
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  border: '1px solid #eeeeee',
}
const footer = {
  fontSize: '13px',
  color: '#999999',
  lineHeight: '1.5',
  margin: '24px 0 0',
}
const signature = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '24px 0 0',
}
