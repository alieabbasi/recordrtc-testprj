import type { NextPage } from "next";
import dynamic from 'next/dynamic';
const Recorder = dynamic(() => import("../components/Recorder"), { ssr: false });

const Home: NextPage = () => {
  return (
    <Recorder />
  )
};

export default Home;
