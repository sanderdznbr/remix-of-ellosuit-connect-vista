

# Fix: Sent Messages Appearing in All Conversations

## Problem
When you send a message in one conversation, it visually appears in ALL other conversations. The messages "Bom dia tudo bem?" and "Vi sim, o problema era no seu banco de dados..." are showing in Edina Ribeiro, Antonio Galli, 555181153408, and Gustavo Oliveira conversations simultaneously.

## Root Cause
The bug is in the optimistic message handling inside the `loadMessagesByPhone` function in `WhatsAppCRM.tsx`. When you send a message:

1. A temporary ("optimistic") message is added to the shared `messages` state with a `conversation_id`
2. When you switch to another conversation, the system loads messages from the database for that new contact
3. During the merge step, it keeps ALL temporary messages that haven't been matched to server data -- but it never checks whether those temp messages actually belong to the current conversation
4. Result: temp messages from conversation A leak into conversation B, C, D, etc.

## Solution
Filter temporary messages by `conversation_id` during the merge step so only temp messages belonging to the currently selected conversation are preserved.

## Technical Details

**File:** `src/components/CRM/WhatsAppCRM.tsx`

**Change in `loadMessagesByPhone` function (around line 566-604):**

Currently the code does:
```typescript
const tempMessages = prev.filter(m => m.id.startsWith('temp-'));
```

This needs to also filter by the current conversation's ID:
```typescript
const tempMessages = prev.filter(m =>
  m.id.startsWith('temp-') &&
  m.conversation_id === currentConversationId
);
```

The function will need access to the current conversation ID. Since `loadMessagesByPhone` takes `contactPhone` as parameter, we need to pass the conversation ID as well, or derive it from the conversations loaded in the query (the `conversationIds` array already available at line 516).

The fix adds a single filtering condition to scope temp messages to only the conversation(s) matching the current contact phone, preventing cross-conversation message leakage.

