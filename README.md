
# 🧠 Code Analyzer

**Ferramenta gráfica para análise automática de código Python, JavaScript, CSS e HTML**, com geração de relatórios detalhados em PDF e HTML.

---

## ✨ Funcionalidades

- **Análise de múltiplas linguagens** (`.py`, `.js`, `.css`, `.html`), com detecção de:
  - Funções e variáveis não utilizadas
  - Imports desnecessários (Python)
  - Problemas de sintaxe e estilo (PEP8)
  - Código morto, duplicado ou de terceiros
  - Sugestões de refatoração e boas práticas
  - Padrões perigosos e erros comuns
  - Propriedades CSS inválidas, seletores duplicados ou não utilizados
  - HTML com tags mal formadas, imagens sem `alt`, links sem `href`, etc.
- **Interface gráfica moderna** desenvolvida com [CustomTkinter](https://github.com/TomSchimansky/CustomTkinter)
- **Geração de relatórios em PDF e HTML** com resumo dos problemas encontrados
- **Suporte a temas claro e escuro**
- **Suporte multilíngue** (Português e Inglês) com troca dinâmica
- **Cópia rápida dos resultados** para a área de transferência
- **Execução da análise em threads separadas** (evita travamentos na interface)
- **Análise de cobertura de testes e performance (Python)**

---

## 🚀 Como executar

1. **Instale as dependências**:
   ```bash
   pip install customtkinter pillow reportlab pycodestyle flask flask-cors
   ```

2. **Execute a aplicação**:
   ```bash
   python gui_main.py
   ```

> 💡 Você também pode iniciar a API com:
> ```bash
> python api.py
> ```

---

## 🖥️ Como usar

1. Abra a interface com `python gui_main.py`  
2. Clique em **Select File** e escolha um arquivo `.py`, `.js`, `.css` ou `.html`
3. Aguarde a análise automática  
4. Visualize os resultados detalhados na tela  
5. Gere relatórios em PDF ou HTML com **Generate Report**  

---

## 📊 Exemplos de análise

### 🐍 Python
- Funções/variáveis não utilizadas
- Imports desnecessários
- `print()`, `TODO`, código duplicado ou morto
- Complexidade, PEP8, uso de bibliotecas externas

### ⚙️ JavaScript
- Uso de `var`, `eval`, `document.write`, `console.log`
- `TODO/FIXME`, números mágicos, arrow functions
- Ausência de ponto e vírgula, más práticas

### 🎨 CSS
- Propriedades inválidas, repetidas ou desconhecidas
- Seletores duplicados ou não utilizados

### 🧱 HTML
- Tags não fechadas, de fechamento sem abertura
- IDs duplicados
- Imagens sem `alt`, links sem `href`

---

## 🛠️ Requisitos

- Python **3.10+**
- Bibliotecas necessárias:
  - `customtkinter`
  - `pillow`
  - `reportlab`
  - `pycodestyle`
  - `flask` e `flask-cors` (opcional, para API)

---

## 👨‍💻 Autor

Desenvolvido por [**Hiidoko**](https://github.com/Hiidoko) 🧪

---

## 📄 Licença

Este projeto está licenciado sob os termos da  
**Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

Você pode usar, modificar e compartilhar este projeto **somente para fins não comerciais**, com a devida atribuição.  
🔗 [Leia a licença completa aqui](https://creativecommons.org/licenses/by-nc/4.0/legalcode)

---
