import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Challenges live on the Football page. */
export default function FindOpponentPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/sports/football", { replace: true });
  }, [navigate]);
  return null;
}
