import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";

import { jellyfin } from "../lib/jellyfin";

import { useAuthStore } from "../store/auth";

// Logo
import logo from "../assets/parallaxtv_logo.svg";

export function Login() {
  const navigate = useNavigate();

  const { setAuthData } = useAuthStore();

  const [serverUrl, setServerUrl] = useState(
    "http://192.168.1.50:8096"
  );

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<
    "idle" | "connecting" | "error"
  >("idle");

  const [errorMessage, setErrorMessage] = useState("");

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    setStatus("connecting");

    setErrorMessage("");

    try {
      const api = jellyfin.createApi(serverUrl);

      const userApi = getUserApi(api);

      const response =
        await userApi.authenticateUserByName({
          authenticateUserByName: {
            Username: username,
            Pw: password,
          },
        });

      const token = response.data.AccessToken;

      const userId = response.data.User?.Id;

      if (!token || !userId) {
        throw new Error(
          "Missing Jellyfin authentication data"
        );
      }

      setAuthData({
        userId,
        serverUrl,
        token,
        username:
          response.data.User?.Name ?? username,
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Auth Error:", error);

      setStatus("error");

      setErrorMessage(
        "Failed to connect. Check your server URL and credentials."
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative px-4 bg-[#0d0d0d]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a0000_0%,_#0d0d0d_70%)]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-[400px] animate-[fadeIn_0.5s_ease-out]">
        <img
          src={logo}
          alt="Parallax TV"
          className="h-16 w-auto mb-4 drop-shadow-lg"
        />

        <p className="text-gray-500 text-sm mb-10">
          Connect to your Jellyfin server
        </p>

        <form
          onSubmit={handleConnect}
          className="w-full bg-black/50 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl flex flex-col gap-4"
        >
          <h2 className="text-xl font-bold text-white mb-1">
            Sign In
          </h2>

          <input
            type="text"
            value={serverUrl}
            onChange={(e) =>
              setServerUrl(e.target.value)
            }
            placeholder="Server URL"
            className="px-4 py-3 bg-white/6 border border-white/10 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600/60 text-sm transition"
          />

          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="Username"
            className="px-4 py-3 bg-white/6 border border-white/10 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600/60 text-sm transition"
          />

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            className="px-4 py-3 bg-white/6 border border-white/10 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600/60 text-sm transition"
          />

          {status === "error" && (
            <div className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 px-3 py-2 rounded-lg">
              {errorMessage}
            </div>
          )}

          <button
            disabled={status === "connecting"}
            className="mt-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all active:scale-98 shadow-lg shadow-red-900/30"
          >
            {status === "connecting"
              ? "Connecting..."
              : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}