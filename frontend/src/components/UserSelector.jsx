import { useState } from "react";
import { getCoachData } from "../api/coachApi";

export default function UserSelector({ setData }) {
  const [userId, setUserId] = useState("");

  const loadData = async () => {
    const data = await getCoachData(userId);
    setData(data);
  };

  return (
    <div>
      <input
        placeholder="Enter User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <button onClick={loadData}>Get Report</button>
    </div>
  );
}