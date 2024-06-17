import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  console.log('meta function')
  return [
    { title: "City download portal" },
  ];
};

export default function Index() {
  return null;
}
