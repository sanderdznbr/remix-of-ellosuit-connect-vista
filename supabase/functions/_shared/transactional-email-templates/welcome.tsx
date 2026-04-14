/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'elloContent'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo(a) ao {SITE_NAME}! 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Olá, ${name}! 👋` : 'Bem-vindo(a)! 👋'}
        </Heading>
        <Text style={text}>
          Ficamos felizes em ter você no <strong>{SITE_NAME}</strong>! Agora você pode criar carrosséis e posts incríveis com inteligência artificial.
        </Text>
        <Text style={text}>
          Explore nossos estilos no Marketplace, personalize sua marca e comece a gerar conteúdo profissional em segundos.
        </Text>
        <Button style={button} href="https://ellocontent.com">
          Começar agora
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          Equipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: `Bem-vindo(a) ao ${SITE_NAME}! 🎉`,
  displayName: 'Boas-vindas',
  previewData: { name: 'Sander' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  backgroundColor: '#7B50DC',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '8px 0 24px',
}
const hr = { borderTop: '1px solid #e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '0' }
