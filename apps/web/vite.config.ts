import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = "https://nv414bjgp8.execute-api.us-east-1.amazonaws.com";

export default defineConfig({
	base: "/proiect-CC/",
	plugins: [react()],
	server: {
		proxy: {
			"/courses": API_TARGET,
			"/dashboard": API_TARGET,
			"/materials": API_TARGET,
			"/study-plans": API_TARGET,
			"/study-tasks": API_TARGET,
			"/notifications": API_TARGET,
			"/reminders": API_TARGET,
		},
	},
});
