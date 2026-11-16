import { gamePackSchema } from "./game-content";

const lessons = [
  {
    id: "custo-porcao", title: "Custo por porção",
    description: "Some os gastos do lote e divida pelas porções vendáveis. Use o rendimento real após perdas.\n\nExemplo: ingredientes de R$ 36 e embalagem de R$ 12 custam R$ 48. Se o lote rende 8 porções, cada uma custa R$ 6. Confira multiplicando 8 × 6.",
    pairs: [["Custo do lote", "Soma dos gastos do preparo"], ["Rendimento", "Quantidade vendável"]],
    statement: "Para um custo total fixo, perder porções aumenta o custo por porção.",
    guided: [{ question: "Um lote custa R$ 60 e rende 10 porções. Divida o custo pelo rendimento. Qual é o custo unitário?", answer: 6 }, { question: "Dos 12 pratos preparados, 2 foram descartados. O lote custou R$ 70. Use apenas os pratos vendáveis. Qual é o custo unitário?", answer: 7 }],
    challenges: [{ question: "Ingredientes custam R$ 44 e as embalagens, R$ 10. O lote rendeu 9 porções vendáveis. Qual é o custo por porção?", answer: 6, solution: "(44 + 10) ÷ 9 = R$ 6,00." }, { question: "Um lote de R$ 72 rende 12 porções, mas 3 foram descartadas. Qual é o custo por porção vendável?", answer: 8, solution: "72 ÷ (12 − 3) = R$ 8,00." }],
  },
  {
    id: "margem-markup", title: "Margem e markup",
    description: "Margem é o lucro dividido pelo preço de venda. Markup percentual é o lucro dividido pelo custo. Neste curso, considere somente os custos informados.\n\nExemplo: com custo de R$ 18 e margem desejada de 25%, o custo representa 75% do preço. Divida 18 por 0,75 para obter R$ 24. Confira: (24 − 18) ÷ 24 = 25%.",
    pairs: [["Margem", "Lucro dividido pelo preço de venda"], ["Markup percentual", "Lucro dividido pelo custo"]],
    statement: "Um markup de 25% sobre o custo produz uma margem de 20% sobre a venda.",
    guided: [{ question: "O custo é R$ 15 e a margem desejada é 25%. Divida o custo pela fração do preço que cobre o custo. Qual preço cobrar?", answer: 20 }, { question: "O custo é R$ 24 e a margem desejada é 20%. O custo representa 80% da venda. Qual é o preço?", answer: 30 }],
    challenges: [{ question: "Um prato custa R$ 21 para produzir. Qual preço dá margem de 30%?", answer: 30, solution: "21 ÷ (1 − 0,30) = R$ 30,00. Confira: 9 ÷ 30 = 30%." }, { question: "Uma refeição custa R$ 27 por unidade. Qual preço garante margem de 25%?", answer: 36, solution: "27 ÷ 0,75 = R$ 36,00. Confira: 9 ÷ 36 = 25%." }],
  },
  {
    id: "promocoes", title: "Promoções e lucro",
    description: "Aplique o desconto ao preço anunciado e só então subtraia o custo para obter o lucro. Para comparar com uma margem mínima, divida o lucro pelo preço após desconto.\n\nExemplo: um prato de R$ 40 com desconto de 25% sai por R$ 30. Com custo de R$ 24, sobram R$ 6 por pedido e a margem é 6 ÷ 30 = 20%.",
    pairs: [["Preço com desconto", "Preço original vezes a parcela paga"], ["Lucro por pedido", "Preço com desconto menos custo"]],
    statement: "Se o custo é fixo, um desconto no preço reduz o lucro por pedido.",
    guided: [{ question: "Um prato de R$ 50 tem desconto de 20% e custo de R$ 28. Calcule o preço com desconto antes de subtrair o custo. Qual é o lucro?", answer: 12 }, { question: "Um prato de R$ 40 tem desconto de 10% e custa R$ 24. O preço promocional é R$ 36. Qual é o lucro por pedido?", answer: 12 }],
    challenges: [{ question: "Uma refeição de R$ 60 custa R$ 33. Qual o lucro por pedido com desconto de 25%?", answer: 12, solution: "60 × 0,75 − 33 = R$ 12,00." }, { question: "Um prato custa R$ 24 e vende por R$ 40. A promoção A dá R$ 8 de desconto e a B dá 25%. Qual preserva a maior margem? Informe o lucro por pedido da promoção escolhida em reais e justifique a comparação.", answer: 8, solution: "A: 40 − 8 − 24 = R$ 8,00, com margem de 25%. B: 40 × 0,75 − 24 = R$ 6,00, com margem de 20%. A preserva a maior margem." }],
  },
];

export const pricingPilot = gamePackSchema.parse({
  schema: "evolua-game-pack", version: 1, id: "precificacao-piloto",
  title: "Precificação para pequenos restaurantes",
  description: "Pratique custo por porção, margem e promoções com exemplos de um restaurante fictício.",
  modules: lessons.map(lesson => ({
    id: lesson.id, title: lesson.title, description: lesson.description, difficulty: "iniciante",
    pairs: lesson.pairs.map(([prompt, answer], index) => ({
      id: `${lesson.id}-par-${index}`, prompt, answer, explanation: `${prompt}: ${answer}.`,
    })),
    trueFalse: [{ id: `${lesson.id}-conceito`, statement: lesson.statement, answer: true, explanation: lesson.description }],
    multipleChoice: lesson.guided.map(({ question, answer }, index) => ({
      id: `${lesson.id}-guiada-${index}`, question,
      options: [answer, answer + 1, answer + 4, answer + 6].map(value => `R$ ${value},00`),
      correctOptionIndex: 0, explanation: `Aplicando o procedimento do enunciado, o resultado é R$ ${answer},00.`,
    })),
  })),
});

export function pricingChallenges(packId: string, moduleId: string) {
  return packId === pricingPilot.id ? lessons.find(lesson => lesson.id === moduleId)?.challenges ?? [] : [];
}
