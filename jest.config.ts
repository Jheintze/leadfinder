import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config = {
  testEnvironment: "jsdom",
};

export default createJestConfig(config);