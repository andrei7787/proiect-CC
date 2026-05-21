import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = process.env.VITE_API_BASE_URL ?? "";

export default defineConfig({
	base: "/proiect-CC/",
	plugins: [react()],
	...(API_TARGET
		? {
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
			}
		: {}),
});
