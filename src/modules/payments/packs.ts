// Importes en céntimos. Nunca conceder créditos desde el retorno de Checkout.
export const testPacks = {
  basic: { credits: 10, amountCents: 1000, currency: "eur" },
  pro: { credits: 25, amountCents: 2000, currency: "eur" },
} as const;
