import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { genetic } from "./genetic";

const regression = 1.1;
const n = 500_000 * regression;

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const mutation = genetic(n);

  return {
    statusCode: 200,
    body: JSON.stringify({
      mutation,
      n,
    }),
  };
};
