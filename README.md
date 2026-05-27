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

![Diagrama servicii](docs/assets/architecture-services.png)

### Servicii AWS

| Serviciu | Rol |
|----------|-----|
| **AWS Amplify** | Hosting pentru frontend-ul React. Serveste aplicatia web static si gestioneaza configurarile de mediu. |
| **Amazon Cognito** | Autentificare si gestionare utilizatori. Ofera inregistrare, confirmare email si login prin User Pool. |
| **Amazon API Gateway** (HTTP API) | Punct unic de intrare pentru frontend. Expune 11 rute REST si valideaza token-urile JWT emise de Cognito printr-un authorizer. |
| **AWS Lambda** | 13 functii serverless care ruleaza toata logica aplicatiei: handlere HTTP, procesare async, trimitere remindere. Fiecare endpoint are propria functie Lambda (Node.js 22, ARM64). |
| **Amazon DynamoDB** | Baza de date NoSQL cu 5 tabele (Courses, Materials, StudyPlans, StudyTasks, Notifications) in mod on-demand. Fiecare tabel are indecsi secundari globali pentru interogari dupa utilizator, curs sau data. |
| **Amazon S3** | Stocare pentru materialele de studiu incarcate de utilizatori (PDF, TXT, MD). Genereaza URL-uri presigned pentru upload direct din browser. |
| **Amazon SQS** | Coada de mesaje pentru procesarea asincrona a materialelor. Cand un utilizator incarca un material, se trimite un mesaj in coada; functia Lambda `ProcessMaterial` consuma mesajele si ruleaza analiza AI. Include o coada DLQ (dead-letter) pentru mesajele esuate. |
| **Amazon SNS** | Serviciu de notificari. Trimite email-uri zilnice cu remindere pentru task-urile de studiu din ziua respectiva. |
| **Amazon EventBridge** | Regula cron care declanseaza functia `SendReminders` o data pe zi pentru a verifica task-urile scadente si a trimite remindere. |
| **AWS Secrets Manager** | Stocheaza in siguranta cheia API pentru Google Gemini, accesibila doar functiilor Lambda care au nevoie de ea. |
| **Google Gemini API** | Serviciu AI extern folosit de Lambda pentru doua roluri: (1) analiza materialelor de studiu — extrage sumar, concepte-cheie si arii de focus; (2) generare planuri de studiu — creeaza task-uri datate pe baza informatiilor despre curs si a materialelor analizate. |

### Flow

Frontend-ul React este servit prin AWS Amplify. Utilizatorul se autentifica prin Cognito si primeste un token JWT. Toate request-urile API trec prin API Gateway, care valideaza token-ul si redirectioneaza catre functiile Lambda corespunzatoare. Datele sunt persistate in DynamoDB.

Materialele sunt incarcate direct in S3 prin URL-uri presigned, apoi procesate asincron: un mesaj este trimis in SQS, procesat de Lambda impreuna cu Gemini, iar rezultatul (sumar, concepte) este salvat in DynamoDB.

Cand utilizatorul genereaza un plan de studiu, Lambda apeleaza Gemini cu detaliile cursului si analizele materialelor, apoi scrie tranzactional planul si task-urile in DynamoDB. Zilnic, EventBridge declanseaza functia de remindere, care verifica task-urile din ziua curenta si trimite notificari prin SNS Email.

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

## Build

```bash
npm run build
```

## Configurare

Frontendul foloseste variabilele `VITE_API_BASE_URL`, `VITE_AWS_REGION`, `VITE_COGNITO_USER_POOL_ID` si `VITE_COGNITO_USER_POOL_CLIENT_ID`.

Backendul are nevoie de secretul `gemini-api-key` in AWS Secrets Manager si de o adresa de email pentru remindere.
