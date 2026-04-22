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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você foi convidado para o {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>ellocontent</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Você foi convidado</Heading>
          <Text style={text}>
            Você recebeu um convite para participar do <strong>{siteName}</strong>.
            Clique no botão abaixo para aceitar e criar sua conta.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Aceitar convite
          </Button>
          <Text style={footer}>
            Se você não estava esperando este convite, pode ignorar este e-mail.
          </Text>
        </Section>
        <Text style={signature}>— Equipe ellocontent</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
