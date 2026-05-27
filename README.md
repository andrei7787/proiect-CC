# AI Study Planner

Aplicatie web care ajuta studentii sa isi organizeze cursurile, materialele si planurile de invatare cu ajutorul AI.

## Ce face

- autentificare cu Amazon Cognito
- creare cursuri si termene de examen
- incarcare materiale de studiu in Amazon S3
- procesare asincrona prin SQS si Lambda
- sumarizare si concepte-cheie cu Google Gemini
- generare plan de studiu si task-uri
- remindere prin Amazon SNS Email

## Arhitectura

![Diagrama servicii](/architecture-services.png)

Frontendul este servit prin AWS Amplify. API-ul trece prin Amazon API Gateway si Lambda, cu date salvate in DynamoDB. Materialele sunt incarcate in S3, apoi procesate asincron prin SQS si un Processor Lambda care foloseste Gemini. Reminder-ele sunt declansate zilnic prin EventBridge si trimise prin SNS Email.

## Tehnologii

- React + Vite
- TypeScript
- AWS CDK
- AWS Amplify, Cognito, API Gateway, Lambda, DynamoDB, S3, SQS, EventBridge, SNS, Secrets Manager
- Google Gemini API

## Rulare locala

```bash
npm install
npm --workspace apps/web run dev
```

## Testare

```bash
npm test
```

## Build

```bash
npm run build
```

## Configurare

Frontendul foloseste variabilele `VITE_API_BASE_URL`, `VITE_AWS_REGION`, `VITE_COGNITO_USER_POOL_ID` si `VITE_COGNITO_USER_POOL_CLIENT_ID`.

Backendul are nevoie de secretul `gemini-api-key` in AWS Secrets Manager si de o adresa de email pentru remindere.
