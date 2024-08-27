import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { transformAsync } from "@babel/core";

const code = `
// Main execution
(async () => {
	// Modern JavaScript code with ES6+ features

	// Using async/await with Promises
	const fetchData = async (url) => {
	try {
		const response = await fetch(url);
		if (!response.ok) {
		throw new Error('Network response was not ok');
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Fetch error:', error);
		throw error;
	}
	};

	// Using classes and inheritance
	class Animal {
	constructor(name) {
		this.name = name;
	}

	speak() {
		console.log(this.name + 'makes a sound.');
	}
	}

	class Dog extends Animal {
	constructor(name, breed) {
		super(name);
		this.breed = breed;
	}

	speak() {
		console.log(this.name + 'the' + this.breed + 'barks.');
	}
	}

	// Using generators
	function* numberGenerator() {
	let number = 0;
	while (true) {
		yield number++;
	}
	}

	// Using Proxy for dynamic behavior
	const handler = {
	get: function (target, prop, receiver) {
		if (prop in target) {
		return target[prop];
		} else {
		return 'Property' + prop + 'does not exist.';
		}
	}
	};

	const proxy = new Proxy({ a: 1, b: 2 }, handler);

	// Using template literals
	const greet = (name) => {
	return 'Hello,' + name;
	};

	// Using destructuring and default parameters
	const displayUser = ({ name, age = 30 } = {}) => {
	console.log('User:' + name + 'Age:' + age);
	};

	// Using rest and spread operators
	const sum = (...numbers) => {
	return numbers.reduce((acc, num) => acc + num, 0);
	};

  // Fetch data from a fake API
  const data = await fetchData('https://jsonplaceholder.typicode.com/posts/1');
  console.log('Fetched Data:', data);

  // Create a new Dog instance
  const myDog = new Dog('Buddy', 'Golden Retriever');
  myDog.speak();

  // Use the number generator
  const gen = numberGenerator();
  console.log('Generated Numbers:', gen.next().value, gen.next().value, gen.next().value);

  // Access properties via Proxy
  console.log('Proxy:', proxy.a, proxy.b, proxy.c);

  // Greet a user
  console.log(greet('Alice'));

  // Display user information
  displayUser({ name: 'Bob', age: 25 });
  displayUser({ name: 'Charlie' });

  // Calculate sum of numbers
  console.log('Sum:', sum(1, 2, 3, 4, 5));
})();

`;

const regression = 1.1;
const n = 25 * regression;

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Join the code multiple times to make it bigger
  let transformed = "";

  for (let i = 0; i < n; i++) {
    transformed = (await transformAsync(code))?.code ?? "";
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      transformed: JSON.stringify(transformed),
    }),
  };
};
