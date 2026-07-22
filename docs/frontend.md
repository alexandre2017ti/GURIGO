# 🌐 Arquitetura do Front-End (RHSystem.UI)

## 📌 Visão Geral
O front-end é a interface de interação com o usuário, focado na gestão de RH e operação dos quiosques de ponto. Desenvolvido com **React, Vite e Node**.

## 📐 Padrão de Interface (UI/UX)
- **Resolução Base:** Toda a interface e escalonamento devem ser projetados com foco na resolução **1920x1080** (Full HD) como padrão. 
- **Responsividade:** Adaptações para resoluções menores devem ocorrer de forma fluida, mas o target principal de desenvolvimento é 1080p.

## 🛠️ Tecnologias
- **Framework:** React + Vite
- **Gerenciador de Pacotes:** npm / yarn
- **Comunicação:** Axios ou Fetch API para consumo do Back-end (C#).

## 📂 Estrutura de Pastas
- `/src/components`: Componentes reutilizáveis (botões, modais, alertas).
- `/src/pages`: Telas completas (Dashboard, Bater Ponto, Relatórios).
- `/src/services`: Funções de chamada HTTP para a API.
- `/src/assets`: Imagens, ícones e estilos globais.
