import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const { choices } = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    max_tokens: 100,
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: "What is love?",
      },
    ],
  });

  const text = choices[0].message.content;

  return {
    statusCode: 200,
    body: JSON.stringify({
      text,
    }),
  };
};
