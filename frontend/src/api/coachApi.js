export const getDashboard = async (userId, feedback = null) => {
  const url = `http://localhost:8000/user/${userId}/dashboard${feedback ? `?feedback=${feedback}` : ""}`;
  const res = await fetch(url);
  return await res.json();
};