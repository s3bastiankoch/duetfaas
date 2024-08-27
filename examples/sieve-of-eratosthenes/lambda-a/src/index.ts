import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { sieveOfEratosthenes } from "./sieve-of-eratosthenes";

const regression = 1;
const n = 500_000 * regression;

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const primeNumbers = sieveOfEratosthenes(n);

  return {
    statusCode: 200,
    body: JSON.stringify({
      // primeNumbers,
      n,
    }),
  };
};
