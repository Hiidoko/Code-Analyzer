import customtkinter as ctk
from tkinter import filedialog, messagebox, Text
from PIL import Image, ImageTk
from analyzer import AnalyzerPython, AnalyzerHTML, AnalyzerCSS, AnalyzerJavaScript, analyze_code
from report_generator import generate_pdf_report, generate_html_report
import os
import threading
import json
import queue
import time

CONFIG_FILE = "config.json"

TRANSLATIONS = {
    "en": {
        "select_file": "📂 Select File",
        "generate_report": "📝 Generate Report",
        "copy_result": "📋 Copy Result",
        "tools": "Tools",
        "settings": "Settings",
        "help": "Help",
        "language": "Language",
        "theme": "Theme",
        "switch_language": "Switch Language",
        "switch_theme": "Switch Theme",
        "footer": "Code Analysis Tool - Version 1.0 | Created by Hiidoko",
        "help_text": (
            "1. Click 'Select File' to choose a code file.\n"
            "2. Wait for the analysis.\n"
            "3. See the results and generate PDF/HTML reports.\n"
            "4. Use the buttons to copy results or adjust the theme."
        ),
    }
}
current_language = ["en"]

def tr(key):
    return TRANSLATIONS[current_language[0]].get(key, key)

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as file:
                return json.load(file)
        except Exception as e:
            print(f"Erro ao carregar configurações: {e}")
    return {}

def save_config(config):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as file:
            json.dump(config, file, indent=4)
    except Exception as e:
        print(f"Erro ao salvar configurações: {e}")

analysis_result = None

def analyze_file(root: ctk.CTk, progress_bar: ctk.CTkProgressBar, analyze_button: ctk.CTkButton, report_button: ctk.CTkButton):
    config = load_config()
    initial_dir = config.get("last_directory", os.getcwd())
    analyze_button.configure(state="disabled")
    report_button.configure(state="disabled")
    progress_bar.set(0)
    file_path = filedialog.askopenfilename(
        title="Selecione um arquivo para análise",
        initialdir=initial_dir,
        filetypes=(
            ("Todos os arquivos", "*.*"),
            ("Arquivos Python", "*.py"),
            ("Arquivos HTML", "*.html"),
            ("Arquivos CSS", "*.css"),
            ("Arquivos JavaScript", "*.js"),
        ),
    )
    if not file_path:
        analyze_button.configure(state="normal")
        report_button.configure(state="normal")
        return
    config["last_directory"] = os.path.dirname(file_path)
    save_config(config)
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            code = file.read()
    except FileNotFoundError:
        messagebox.showerror("Erro", "O arquivo selecionado não foi encontrado.")
        analyze_button.configure(state="normal")
        report_button.configure(state="normal")
        return
    except PermissionError:
        messagebox.showerror("Erro", "Permissão negada para abrir o arquivo.")
        analyze_button.configure(state="normal")
        report_button.configure(state="normal")
        return
    if not code.strip():
        messagebox.showerror("Erro", "O arquivo selecionado está vazio.")
        analyze_button.configure(state="normal")
        report_button.configure(state="normal")
        return
    result_queue = queue.Queue()
    start_time = time.time()
    def perform_analysis(code: str, result_queue: queue.Queue):
        progress_bar.configure(progress_color="#FFD700")
        progress_bar.set(50)
        if file_path.endswith(".py"):
            analyzer = AnalyzerPython()
            result = analyze_code(code)
        elif file_path.endswith(".html"):
            analyzer = AnalyzerHTML()
            result = analyzer.analyze(code)
        elif file_path.endswith(".css"):
            analyzer = AnalyzerCSS()
            result = analyzer.analyze(code)
        elif file_path.endswith(".js"):
            analyzer = AnalyzerJavaScript()
            result = analyzer.analyze(code)
        elif file_path.endswith(".json"):
            try:
                json.loads(code)
                result = {"valid_json": True, "message": "JSON válido."}
            except json.JSONDecodeError as e:
                result = {"valid_json": False, "message": f"Erro no JSON: {e}"}
        elif file_path.endswith(".xml"):
            try:
                import xml.etree.ElementTree as ET
                ET.fromstring(code)
                result = {"valid_xml": True, "message": "XML válido."}
            except ET.ParseError as e:
                result = {"valid_xml": False, "message": f"Erro no XML: {e}"}
        else:
            result = {"error": "Tipo de arquivo não suportado."}
        result_queue.put(result)
        result_queue.put({"_elapsed_time": time.time() - start_time})
    thread = threading.Thread(target=perform_analysis, args=(code, result_queue))
    thread.start()
    def check_analysis():
        if not thread.is_alive():
            try:
                result = result_queue.get_nowait()
                elapsed = 0
                try:
                    extra = result_queue.get_nowait()
                    if "_elapsed_time" in extra:
                        elapsed = extra["_elapsed_time"]
                except queue.Empty:
                    pass
                display_results(result, file_path, elapsed)
                progress_bar.set(100)
                progress_bar.configure(progress_color="#32CD32")
                analyze_button.configure(state="normal")
                report_button.configure(state="normal")
                root.result = result
            except queue.Empty:
                messagebox.showerror("Erro", "A análise não retornou nenhum resultado.")
        else:
            root.after(100, check_analysis)
    check_analysis()

def display_results(result: dict, file_path: str, elapsed_time: float = 0):
    result_text.delete("1.0", ctk.END)
    result_text.insert(ctk.END, f"Analisando arquivo: {file_path}\n\n", "title")
    if "error" in result:
        result_text.insert(ctk.END, f"Erro: {result['error']}\n", "warning")
        return
    if file_path.endswith(".py"):
        result_text.configure(bg="#1E1E1E")
        erros = 0
        if result.get("syntax_errors"):
            erros += 1
            result_text.insert(ctk.END, "❗ Erros de sintaxe:\n", "warning")
            for err in result["syntax_errors"]:
                result_text.insert(ctk.END, f"   - {err}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("unused_functions"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Funções declaradas e não usadas:\n", "warning")
            for fname in result["unused_functions"]:
                result_text.insert(ctk.END, f"   - {fname}\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Remova funções não utilizadas para manter o código limpo.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("unused_vars"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Variáveis declaradas e não usadas:\n", "warning")
            for vname in result["unused_vars"]:
                result_text.insert(ctk.END, f"   - {vname}\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Remova variáveis não utilizadas para manter o código limpo.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("unused_imports"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Imports não utilizados:\n", "warning")
            for imp in result["unused_imports"]:
                result_text.insert(ctk.END, f"   - {imp}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("docstring_issues"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Funções/classes sem docstring:\n", "warning")
            for lineno, issue in result["docstring_issues"]:
                result_text.insert(ctk.END, f"   - Linha {lineno}: {issue}\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Adicione docstrings para documentar seu código.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("dead_code"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Código morto encontrado:\n", "warning")
            for lineno, desc in result["dead_code"]:
                result_text.insert(ctk.END, f"   - Linha {lineno}: {desc}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("duplicate_functions"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Funções duplicadas:\n", "warning")
            for funcs in result["duplicate_functions"]:
                result_text.insert(ctk.END, f"   - {', '.join(funcs)}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("uninitialized_vars"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Variáveis usadas sem declaração:\n", "warning")
            for vname in result["uninitialized_vars"]:
                result_text.insert(ctk.END, f"   - {vname}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("print_statements"):
            result_text.insert(ctk.END, "ℹ️ Uso de print encontrado:\n", "normal")
            for lineno, code in result["print_statements"]:
                result_text.insert(ctk.END, f"   - Linha {lineno}: {code}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("style_issues"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Problemas de estilo (PEP 8):\n", "warning")
            for issue in result["style_issues"]:
                result_text.insert(ctk.END, f"   - {issue}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("common_errors"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Padrões de erro comuns detectados:\n", "warning")
            for lineno, error in result["common_errors"]:
                result_text.insert(ctk.END, f"   - Linha {lineno}: {error}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("refactor_suggestions"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Sugestões de refatoração:\n", "warning")
            for lineno, suggestion in result["refactor_suggestions"]:
                result_text.insert(ctk.END, f"   - Linha {lineno}: {suggestion}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("third_party_code"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Código de terceiros detectado:\n", "warning")
            for lineno, desc in result["third_party_code"]:
                result_text.insert(ctk.END, f"   - Linha {lineno}: {desc}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if erros:
            result_text.insert(ctk.END, f"\nForam encontrados {erros} tipos de problemas no Python acima.\n", "warning")
        else:
            result_text.insert(ctk.END, "Nenhum erro estrutural encontrado no Python.\n", "success")
    elif file_path.endswith(".js"):
        result_text.configure(bg="#23272E")
        erros = 0
        if result.get("syntax_errors"):
            erros += 1
            result_text.insert(ctk.END, "❗ Erros de sintaxe:\n", "warning")
            for err in result["syntax_errors"]:
                result_text.insert(ctk.END, f"   - {err}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("unused_functions"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Funções declaradas e não usadas:\n", "warning")
            for fname, linha in result["unused_functions"]:
                result_text.insert(ctk.END, f"   - {fname} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Remova funções não utilizadas para manter o código limpo.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("unused_variables"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Variáveis declaradas e não usadas:\n", "warning")
            for vname, linha in result["unused_variables"]:
                result_text.insert(ctk.END, f"   - {vname} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Remova variáveis não utilizadas para manter o código limpo.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("var_usage"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Uso de 'var' detectado (prefira let/const):\n", "warning")
            for linha in result["var_usage"]:
                result_text.insert(ctk.END, f"   - Linha {linha}\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Use let ou const para declarar variáveis modernas.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("eval_usage"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Uso de 'eval' detectado (evite por segurança):\n", "warning")
            for linha in result["eval_usage"]:
                result_text.insert(ctk.END, f"   - Linha {linha}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("document_write_usage"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Uso de 'document.write' detectado (evite em produção):\n", "warning")
            for linha in result["document_write_usage"]:
                result_text.insert(ctk.END, f"   - Linha {linha}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("todo_comments"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Comentários TODO/FIXME encontrados:\n", "warning")
            for comment, linha in result["todo_comments"]:
                result_text.insert(ctk.END, f"   - {comment} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("long_lines"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Linhas muito longas (>120 caracteres):\n", "warning")
            for linha in result["long_lines"]:
                result_text.insert(ctk.END, f"   - Linha {linha}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("magic_numbers"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Números mágicos encontrados (considere usar constantes):\n", "warning")
            for num, linha in result["magic_numbers"]:
                result_text.insert(ctk.END, f"   - {num} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        result_text.insert(ctk.END, "⚠️ Números fixos encontrados no código (evite usar valores numéricos \"soltos\", prefira variáveis ou constantes nomeadas):\n", "warning")
        if result.get("semicolon_missing"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Possível falta de ponto e vírgula:\n", "warning")
            for linha in result["semicolon_missing"]:
                result_text.insert(ctk.END, f"   - Linha {linha}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("arrow_functions"):
            result_text.insert(ctk.END, "ℹ️ Funções arrow encontradas:\n", "normal")
            for fname, linha in result["arrow_functions"]:
                result_text.insert(ctk.END, f"   - {fname} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("anonymous_functions"):
            result_text.insert(ctk.END, "ℹ️ Funções anônimas atribuídas encontradas:\n", "normal")
            for fname, linha in result["anonymous_functions"]:
                result_text.insert(ctk.END, f"   - {fname} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("double_equals"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Uso de '==' encontrado (prefira '==='):\n", "warning")
            for linha in result["double_equals"]:
                result_text.insert(ctk.END, f"   - Linha {linha}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("console_log_usage"):
            result_text.insert(ctk.END, "ℹ️ Uso de console.log encontrado:\n", "normal")
            for linha in result["console_log_usage"]:
                result_text.insert(ctk.END, f"   - Linha {linha}\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if erros:
            result_text.insert(ctk.END, f"\nForam encontrados {erros} tipos de problemas no JS acima.\n", "warning")
        else:
            result_text.insert(ctk.END, "Nenhum erro estrutural encontrado no JS.\n", "success")
    elif file_path.endswith(".html"):
        result_text.configure(bg="#2E2623")
        erros = 0
        if result.get("unclosed_tags"):
            erros += 1
            result_text.insert(ctk.END, "❗ Tags não fechadas:\n", "warning")
            for tag, linha in result["unclosed_tags"]:
                result_text.insert(ctk.END, f"   - <{tag}> na linha {linha}\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Toda tag aberta deve ser fechada, exemplo: <div> ... </div>\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("missing_close_tags"):
            erros += 1
            result_text.insert(ctk.END, "❗ Tags de fechamento sem abertura:\n", "warning")
            for tag, linha in result["missing_close_tags"]:
                result_text.insert(ctk.END, f"   - </{tag}> na linha {linha}\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Não feche tags que não foram abertas.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("incomplete_tags"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Tags incompletas:\n", "warning")
            for tag_str, linha in result["incomplete_tags"]:
                result_text.insert(ctk.END, f"   - {tag_str} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Verifique se todas as tags estão completas, exemplo: <img src='...'>\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("duplicated_ids"):
            erros += 1
            result_text.insert(ctk.END, f"🔁 IDs duplicados: {result['duplicated_ids']}\n", "warning")
            result_text.insert(ctk.END, "→ Dica: IDs devem ser únicos em cada página HTML.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("imgs_without_alt"):
            erros += 1
            result_text.insert(ctk.END, "🖼️ Imagens sem atributo alt:\n", "warning")
            for tag_str, linha in result["imgs_without_alt"]:
                result_text.insert(ctk.END, f"   - {tag_str} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Sempre adicione alt nas imagens para acessibilidade.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("links_without_href"):
            erros += 1
            result_text.insert(ctk.END, "🔗 Links <a> sem href:\n", "warning")
            for tag_str, linha in result["links_without_href"]:
                result_text.insert(ctk.END, f"   - {tag_str} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Todo link deve ter um destino (href).\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if erros:
            result_text.insert(ctk.END, f"\nForam encontrados {erros} tipos de problemas no HTML acima.\n", "warning")
        else:
            result_text.insert(ctk.END, "Nenhum erro estrutural encontrado no HTML.\n", "success")
    elif file_path.endswith(".css"):
        result_text.configure(bg="#232E26")
        erros = 0
        if result.get("duplicated_selectors"):
            erros += 1
            result_text.insert(ctk.END, "❗ Seletores duplicados:\n", "warning")
            for sel in set(result["duplicated_selectors"]):
                linhas = result["selector_lines"].get(sel, [])
                for linha in linhas:
                    result_text.insert(ctk.END, f"   - {sel} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("invalid_selectors"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Seletores inválidos:\n", "warning")
            for sel in set(result["invalid_selectors"]):
                linhas = result["selector_lines"].get(sel, [])
                for linha in linhas:
                    result_text.insert(ctk.END, f"   - {sel} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("invalid_properties"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Propriedades mal formatadas:\n", "warning")
            for seletor, linha, prop in result["invalid_properties"]:
                result_text.insert(ctk.END, f"   - {prop} (seletor {seletor}, linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Use dois pontos para separar propriedade e valor, exemplo: color: red;\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("repeated_properties"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Propriedades repetidas no mesmo seletor:\n", "warning")
            for seletor, linha, prop in result["repeated_properties"]:
                result_text.insert(ctk.END, f"   - {prop} (seletor {seletor}, linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Evite repetir propriedades no mesmo bloco.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("unknown_properties"):
            erros += 1
            result_text.insert(ctk.END, "⚠️ Propriedades desconhecidas (pode ser erro de digitação):\n", "warning")
            for seletor, linha, prop in result["unknown_properties"]:
                result_text.insert(ctk.END, f"   - {prop} (seletor {seletor}, linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Verifique se o nome da propriedade está correto.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if result.get("unused_selectors"):
            erros += 1
            result_text.insert(ctk.END, "🔎 Seletores não utilizados no HTML:\n", "warning")
            for sel in set(result["unused_selectors"]):
                linhas = result["selector_lines"].get(sel, [])
                for linha in linhas:
                    result_text.insert(ctk.END, f"   - {sel} (linha {linha})\n", "normal")
            result_text.insert(ctk.END, "→ Dica: Remova seletores não usados para manter o CSS limpo.\n", "normal")
            result_text.insert(ctk.END, "-"*40 + "\n", "separator")
        if erros:
            result_text.insert(ctk.END, f"\nForam encontrados {erros} tipos de problemas no CSS acima.\n", "warning")
        else:
            result_text.insert(ctk.END, "Nenhum erro estrutural encontrado no CSS.\n", "success")
    elif file_path.endswith(".json"):
        result_text.insert(ctk.END, f"JSON: {result.get('message', 'Erro ao validar JSON')}\n", "normal")
    elif file_path.endswith(".xml"):
        result_text.insert(ctk.END, f"XML: {result.get('message', 'Erro ao validar XML')}\n", "normal")
    result_text.insert(ctk.END, "-"*40 + "\n", "separator")
    if elapsed_time:
        result_text.insert(ctk.END, f"\nTempo de análise: {elapsed_time:.2f} segundos\n", "normal")
    result_text.insert(ctk.END, "\nAnálise concluída.\n", "success")

def generate_report_button_action(root: ctk.CTk):
    if not hasattr(root, "result") or not root.result:
        messagebox.showerror("Erro", "Nenhuma análise foi realizada. Por favor, analise um arquivo primeiro.")
        return
    result = root.result
    format_choice = messagebox.askquestion("Formato do Relatório", "Deseja salvar o relatório em PDF? (Clique em 'Não' para HTML)")
    if format_choice == "yes":
        filetypes = [("PDF Files", "*.pdf")]
        extension = ".pdf"
        generate_function = generate_pdf_report
    else:
        filetypes = [("HTML Files", "*.html")]
        extension = ".html"
        generate_function = generate_html_report
    save_path = filedialog.asksaveasfilename(
        title="Salvar Relatório",
        defaultextension=extension,
        filetypes=filetypes,
    )
    if save_path:
        generate_function(result, save_path)

def add_tooltip(widget, text):
    tooltip = ctk.CTkToplevel()
    tooltip.withdraw()
    tooltip.overrideredirect(True)
    label = ctk.CTkLabel(tooltip, text=text, font=ctk.CTkFont(size=10), fg_color="#333", text_color="#fff")
    label.pack()
    def enter(event):
        tooltip.deiconify()
        tooltip.geometry(f"+{event.x_root+10}+{event.y_root+10}")
    def leave(event):
        tooltip.withdraw()
    widget.bind("<Enter>", enter)
    widget.bind("<Leave>", leave)

def show_help():
    messagebox.showinfo(tr("help"), tr("help_text"))

def create_gui():
    global result_text
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("green")
    root = ctk.CTk()
    root.title("Ferramenta de Análise de Código")
    root.geometry("900x700")
    root.resizable(False, False)
    menu_bar = ctk.CTkFrame(root, height=40, fg_color="#1E1E1E")
    menu_bar.pack(side="top", fill="x")
    main_button = ctk.CTkButton(
        menu_bar,
        text=tr("tools"),
        command=lambda: show_tab("main"),
        font=ctk.CTkFont(size=16, weight="bold"),
        width=150,
        corner_radius=10,
        fg_color="#0078D7",
        hover_color="#005A9E",
    )
    help_button = ctk.CTkButton(
        menu_bar,
        text=tr("help"),
        command=show_help,
        font=ctk.CTkFont(size=16, weight="bold"),
        width=100,
        corner_radius=10,
        fg_color="#17A2B8",
        hover_color="#117A8B",
    )
    help_button.pack(side="right", padx=10, pady=5)
    content_frame = ctk.CTkFrame(root, fg_color="#1E1E1E")
    content_frame.pack(side="top", fill="both", expand=True)
    def show_tab(tab_name):
        for widget in content_frame.winfo_children():
            widget.destroy()
        if tab_name == "main":
            progress_bar = ctk.CTkProgressBar(content_frame, width=400, height=20, progress_color="#00BFFF")
            progress_bar.pack(pady=20)
            progress_bar.set(0)
            button_frame = ctk.CTkFrame(content_frame, fg_color="#1E1E1E")
            button_frame.pack(pady=20)
            select_file_button = ctk.CTkButton(
                button_frame,
                text=tr("select_file"),
                command=lambda: analyze_file(root, progress_bar, select_file_button, generate_report_button),
                font=ctk.CTkFont(size=16, weight="bold"),
                corner_radius=10,
                fg_color="#0078D7",
                hover_color="#005A9E",
            )
            select_file_button.pack(side="left", padx=10)
            generate_report_button = ctk.CTkButton(
                button_frame,
                text=tr("generate_report"),
                command=lambda: generate_report_button_action(root),
                font=ctk.CTkFont(size=16, weight="bold"),
                corner_radius=10,
                fg_color="#28A745",
                hover_color="#1E7E34",
            )
            generate_report_button.pack(side="left", padx=10)
            copy_button = ctk.CTkButton(
                button_frame,
                text=tr("copy_result"),
                command=lambda: root.clipboard_append(result_text.get("1.0", ctk.END)),
                font=ctk.CTkFont(size=16, weight="bold"),
                corner_radius=10,
                fg_color="#FFC107",
                hover_color="#B28704",
            )
            copy_button.pack(side="left", padx=10)
            add_tooltip(select_file_button, "Selecione um arquivo para analisar")
            add_tooltip(generate_report_button, "Gere um relatório dos resultados")
            add_tooltip(copy_button, "Copie o resultado para a área de transferência")
            frame = ctk.CTkFrame(content_frame, fg_color="#2E2E2E", corner_radius=10)
            frame.pack(fill="x", padx=20, pady=10)
            current_theme = ctk.get_appearance_mode()
            if current_theme == "Dark":
                text_bg = "#1E1E1E"
                text_fg = "#FFFFFF"
            else:
                text_bg = "#F5F5F5"
                text_fg = "#222222"
            global result_text
            result_text = Text(
                frame,
                wrap="word",
                font=("Courier New", 11),
                bg=text_bg,
                fg=text_fg,
                relief="flat",
                height=16,
                width=90
            )
            result_text.pack(side="left", fill="both", expand=False, padx=10, pady=10)
            result_text.tag_configure('title', foreground='#00BFFF', font=('Courier New', 14, 'bold'))
            result_text.tag_configure('section_title', foreground='#FFD700', font=('Courier New', 12, 'bold'))
            result_text.tag_configure('warning', foreground='#FF6347', font=('Courier New', 12, 'bold'))
            result_text.tag_configure('success', foreground='#32CD32', font=('Courier New', 12, 'bold'))
            result_text.tag_configure('normal', foreground='#FFFFFF', font=('Courier New', 12))
            result_text.tag_configure('keyword', foreground='#FF00FF', font=('Courier New', 12, 'bold'))
            result_text.tag_configure('separator', foreground='#444444', font=('Courier New', 12, 'bold'))
            scrollbar = ctk.CTkScrollbar(frame, command=result_text.yview)
            scrollbar.pack(side="right", fill="y")
            result_text.configure(yscrollcommand=scrollbar.set)
            font_size = [12]
            def set_font_size(delta):
                font_size[0] += delta
                result_text.configure(font=("Courier New", font_size[0]))
            font_frame = ctk.CTkFrame(content_frame, fg_color="#1E1E1E")
            font_frame.pack()
            inc_btn = ctk.CTkButton(font_frame, text="+", width=40, command=lambda: set_font_size(1))
            inc_btn.pack(side="left", padx=2)
            dec_btn = ctk.CTkButton(font_frame, text="-", width=40, command=lambda: set_font_size(-1))
            dec_btn.pack(side="left", padx=2)
            add_tooltip(inc_btn, "Aumentar fonte")
            add_tooltip(dec_btn, "Diminuir fonte")
    def switch_language():
        current_language[0] = "en" if current_language[0] == "pt-br" else "pt-br"
        main_button.configure(text=tr("tools"))
        help_button.configure(text=tr("help"))
        show_tab("main")
    show_tab("main")
    footer = ctk.CTkFrame(root, height=50, fg_color="#1E1E1E")
    footer.pack(side="bottom", fill="x")
    def open_github(event=None):
        import webbrowser
        webbrowser.open_new("https://github.com/Hiidoko")
    footer_label = ctk.CTkLabel(
        footer,
        text=tr("footer"),
        font=ctk.CTkFont(size=12),
        text_color="#FFFFFF",
        cursor="hand2"
    )
    footer_label.pack(pady=10)
    footer_label.bind("<Button-1>", open_github)
    root.mainloop()