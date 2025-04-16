import hashlib
from analyzer import AnalyzerPython, AnalyzerHTML, AnalyzerCSS, AnalyzerJavaScript, analyze_code

def main():
    path = input("Digite o caminho do arquivo que deseja analisar: ").strip()
    try:
        with open(path, "r", encoding="utf-8") as file:
            code = file.read()
    except FileNotFoundError:
        print(f"Arquivo '{path}' não encontrado.")
        return
    except Exception as e:
        print(f"Erro ao abrir o arquivo: {e}")
        return

    if path.endswith(".py"):
        analyzer = AnalyzerPython()
        result = analyze_code(code)
    elif path.endswith(".html"):
        analyzer = AnalyzerHTML()
        result = analyzer.analyze(code)
    elif path.endswith(".css"):
        analyzer = AnalyzerCSS()
        result = analyzer.analyze(code)
    elif path.endswith(".js"):
        analyzer = AnalyzerJavaScript()
        result = analyzer.analyze(code)
    else:
        print("Tipo de arquivo não suportado.")
        return

    if path.endswith(".py"):
        print("Funções declaradas:", result["declared_functions"])
        print("Funções usadas:", result["called_functions"])
        print("Funções NÃO usadas:", result["unused_functions"])
        print()
        print("Variáveis declaradas:", result["declared_vars"])
        print("Variáveis usadas:", result["used_vars"])
        print("Variáveis NÃO usadas:", result["unused_vars"])

        if result["print_statements"]:
            print("\nPrints encontrados:")
            for lineno, code in result["print_statements"]:
                print(f"Linha {lineno}: {code}")
        else:
            print("\nNenhum print() encontrado.")

        if result["unused_imports"]:
            print("\nImports NÃO utilizados:")
            for imp in result["unused_imports"]:
                print(f"- {imp}")
        else:
            print("\nTodos os imports estão sendo utilizados.")
            
        if result["dead_code"]:
            print("\nCódigo morto encontrado:")
            for lineno, description in result["dead_code"]:
                print(f"Linha {lineno}: {description}")
        else:
            print("\nNenhum código morto encontrado.")

        if result["duplicate_functions"]:
            print("\nFunções duplicadas encontradas:")
            for functions in result["duplicate_functions"]:
                print(f"Funções duplicadas: {', '.join(functions)}")
        else:
            print("\nNenhuma função duplicada encontrada.")

        if result["unused_writes"]:
            print("\nVariáveis modificadas, mas nunca usadas:")
            for func, vars in result["unused_writes"].items():
                print(f"Função '{func}': {', '.join(vars)}")
            else:
                print("\nNenhuma variável modificada sem uso encontrada.")

        if result["docstring_issues"]:
            print("\nProblemas de docstrings encontrados:")
            for lineno, issue in result["docstring_issues"]:
                print(f"Linha {lineno}: {issue}")
        else:
            print("\nNenhum problema de docstring encontrado.")

        if result["function_complexity"]:
            print("\nComplexidade das funções:")
            for func, complexity in result["function_complexity"].items():
                print(f"Função '{func}': Loops = {complexity['loops']}, Profundidade = {complexity['depth']}")
        else:
            print("\nNenhuma função analisada para complexidade.")

        if result["uninitialized_vars"]:
            print("\nVariáveis não inicializadas encontradas:")
            for var in result["uninitialized_vars"]:
                print(f"- {var}")
        else:
            print("\nNenhuma variável não inicializada encontrada.")

        if result["style_issues"]:
            print("\nProblemas de estilo (PEP 8) encontrados:")
            for issue in result["style_issues"]:
                print(f"- {issue}")
        else:
            print("\nNenhum problema de estilo encontrado.")

        if result["common_errors"]:
            print("\nErros comuns detectados:")
            for lineno, error in result["common_errors"]:
                print(f"Linha {lineno}: {error}")
        else:
            print("\nNenhum erro comum detectado.")

        if result["refactor_suggestions"]:
            print("\nSugestões de refatoração:")
            for lineno, suggestion in result["refactor_suggestions"]:
                print(f"Linha {lineno}: {suggestion}")
        else:
            print("\nNenhuma sugestão de refatoração encontrada.")

        if result["third_party_code"]:
            print("\nCódigo de terceiros detectado:")
            for lineno, description in result["third_party_code"]:
                print(f"Linha {lineno}: {description}")
        else:
            print("\nNenhum código de terceiros detectado.")

        print("\nVerificando cobertura de testes...")
        test_coverage = analyzer.check_test_coverage()
        print("\nCobertura de testes:")
        print(test_coverage)

        print("\nVerificando problemas de performance...")
        performance_issues = analyzer.check_performance_issues(code)
        if performance_issues:
            print("\nProblemas de performance encontrados:")
            for lineno, issue in performance_issues:
                print(f"Linha {lineno}: {issue}")
        else:
            print("\nNenhum problema de performance encontrado.")

    else:
        for key, issues in result.items():
            if issues:
                print(f"\n{key.capitalize()}:")
                for issue in issues:
                    print(f"- {issue}")
            else:
                print(f"\n{key.capitalize()}: Nenhum problema encontrado.")

    example_code = """
def hello_world():
    print("Hello, world!")
"""
    function_hash = hashlib.md5(example_code.strip().encode()).hexdigest()
    print("\nHash da função exemplo:", function_hash)

if __name__ == "__main__":
    main()
