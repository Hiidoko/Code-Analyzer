from tkinter import messagebox
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def generate_pdf_report(result: dict, file_path: str):
    try:
        pdf = canvas.Canvas(file_path, pagesize=letter)
        pdf.setTitle("Relatório de Análise de Código")
        width, height = letter
        y = height - 40

        pdf.setFont("Helvetica-Bold", 18)
        pdf.setFillColorRGB(0, 0.75, 1)
        pdf.drawString(50, y, "Relatório de Análise de Código")
        y -= 30

        pdf.setFont("Helvetica", 12)
        pdf.setFillColorRGB(1, 1, 1)
        pdf.drawString(50, y, f"Arquivo analisado: {file_path}")
        y -= 25

        erros = sum(
            bool(result.get(key))
            for key in [
                "syntax_errors", "unused_functions", "unused_vars", "unused_imports", "docstring_issues",
                "dead_code", "duplicate_functions", "uninitialized_vars", "style_issues", "common_errors",
                "refactor_suggestions", "third_party_code"
            ]
        )
        pdf.setFont("Helvetica-Bold", 13)
        pdf.setFillColorRGB(1, 0.84, 0)
        pdf.drawString(50, y, f"Resumo: Foram encontrados {erros} tipos de problemas.")
        y -= 20

        pdf.setStrokeColorRGB(0.3, 0.3, 0.3)
        pdf.line(50, y, width - 50, y)
        y -= 20

        def section(title, color=(1, 0.39, 0.28)):
            nonlocal y
            if y < 100:
                pdf.showPage()
                y = height - 40
            pdf.setFont("Helvetica-Bold", 13)
            pdf.setFillColorRGB(*color)
            pdf.drawString(50, y, title)
            y -= 18
            pdf.setFillColorRGB(1, 1, 1)

        def dica(text):
            nonlocal y
            pdf.setFont("Helvetica-Oblique", 10)
            pdf.setFillColorRGB(1, 0.84, 0)
            pdf.drawString(60, y, f"Dica: {text}")
            y -= 15
            pdf.setFillColorRGB(1, 1, 1)

        def item(text):
            nonlocal y
            pdf.setFont("Helvetica", 11)
            pdf.setFillColorRGB(1, 1, 1)
            pdf.drawString(70, y, f"- {text}")
            y -= 13

        if result.get("syntax_errors"):
            section("❗ Erros de sintaxe")
            for err in result["syntax_errors"]:
                item(err)
            y -= 8

        if result.get("unused_functions"):
            section("⚠️ Funções declaradas e não usadas")
            for fname in result["unused_functions"]:
                item(fname)
            dica("Remova funções não utilizadas para manter o código limpo.")
            y -= 8

        if result.get("unused_vars"):
            section("⚠️ Variáveis declaradas e não usadas")
            for vname in result["unused_vars"]:
                item(vname)
            dica("Remova variáveis não utilizadas para manter o código limpo.")
            y -= 8

        if result.get("unused_imports"):
            section("⚠️ Imports não utilizados")
            for imp in result["unused_imports"]:
                item(imp)
            y -= 8

        if result.get("docstring_issues"):
            section("⚠️ Funções/classes sem docstring")
            for lineno, issue in result["docstring_issues"]:
                item(f"Linha {lineno}: {issue}")
            dica("Adicione docstrings para documentar seu código.")
            y -= 8

        pdf.setFont("Helvetica-Bold", 12)
        pdf.setFillColorRGB(0.2, 1, 0.2)
        pdf.drawString(50, y, "Análise concluída.")
        pdf.save()
        messagebox.showinfo("Sucesso", f"Relatório salvo em: {file_path}")
    except Exception as e:
        messagebox.showerror("Erro", f"Erro ao gerar o relatório: {e}")

def generate_html_report(result: dict, file_path: str):
    html = [
        "<html><head>",
        "<meta charset='utf-8'>",
        "<title>Relatório de Análise de Código</title>",
        "<style>",
        "body { font-family: Arial, sans-serif; background: #181818; color: #eee; padding: 30px; }",
        "h1 { color: #00BFFF; }",
        "h2 { color: #FFD700; border-bottom: 1px solid #444; padding-bottom: 4px; }",
        ".section { margin-bottom: 30px; }",
        ".warning { color: #FF6347; font-weight: bold; }",
        ".success { color: #32CD32; font-weight: bold; }",
        ".item { margin-left: 20px; }",
        ".dica { color: #FFD700; font-size: 0.95em; margin-left: 20px; }",
        ".separator { border-top: 1px solid #444; margin: 15px 0; }",
        "</style></head><body>"
    ]
    html.append("<h1>Relatório de Análise de Código</h1>")

    erros = sum(
        bool(result.get(key))
        for key in [
            "syntax_errors", "unused_functions", "unused_vars", "unused_imports", "docstring_issues",
            "dead_code", "duplicate_functions", "uninitialized_vars", "style_issues", "common_errors",
            "refactor_suggestions", "third_party_code"
        ]
    )
    html.append(f"<h2>Resumo</h2><p>Foram encontrados <b>{erros}</b> tipos de problemas.</p><div class='separator'></div>")

    if result.get("syntax_errors"):
        html.append("<div class='section'><h2 class='warning'>❗ Erros de sintaxe</h2><ul>")
        for err in result["syntax_errors"]:
            html.append(f"<li class='item'>{err}</li>")
        html.append("</ul></div>")

    if result.get("unused_functions"):
        html.append("<div class='section'><h2 class='warning'>⚠️ Funções declaradas e não usadas</h2><ul>")
        for fname in result["unused_functions"]:
            html.append(f"<li class='item'>{fname}</li>")
        html.append("</ul><div class='dica'>Dica: Remova funções não utilizadas para manter o código limpo.</div></div>")

    if result.get("unused_vars"):
        html.append("<div class='section'><h2 class='warning'>⚠️ Variáveis declaradas e não usadas</h2><ul>")
        for vname in result["unused_vars"]:
            html.append(f"<li class='item'>{vname}</li>")
        html.append("</ul><div class='dica'>Dica: Remova variáveis não utilizadas para manter o código limpo.</div></div>")

    if result.get("unused_imports"):
        html.append("<div class='section'><h2 class='warning'>⚠️ Imports não utilizados</h2><ul>")
        for imp in result["unused_imports"]:
            html.append(f"<li class='item'>{imp}</li>")
        html.append("</ul></div>")

    if result.get("docstring_issues"):
        html.append("<div class='section'><h2 class='warning'>⚠️ Funções/classes sem docstring</h2><ul>")
        for lineno, issue in result["docstring_issues"]:
            html.append(f"<li class='item'>Linha {lineno}: {issue}</li>")
        html.append("</ul><div class='dica'>Dica: Adicione docstrings para documentar seu código.</div></div>")

    html.append("<div class='separator'></div>")
    html.append("<div class='success'>Análise concluída.</div>")
    html.append("</body></html>")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(html))