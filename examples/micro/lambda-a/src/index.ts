import { sieveOfEratosthenes } from "./sieve-of-eratosthenes";

const regression = 1;
const n = 500_000 * regression;

export default [
  {
    name: "sieveOfEratosthenes",
    handler: () => {
      sieveOfEratosthenes(n);
    },
  },
];
