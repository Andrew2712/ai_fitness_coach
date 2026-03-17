import { useState } from "react";
import UserSelector from "../components/UserSelector";
import ProgressCard from "../components/ProgressCard";
import BurnoutStatus from "../components/BurnoutStatus";
import Forecast from "../components/Forecast";

export default function Dashboard() {
  const [data, setData] = useState(null);

  return (
    <div>
      <h1>AI Fitness Coach Dashboard</h1>

      <UserSelector setData={setData} />

      {data && (
        <>
          <ProgressCard progress={data.progress} />
          <BurnoutStatus burnout={data.burnout} />
          <Forecast forecast={data.forecast} />
        </>
      )}
    </div>
  );
}