import ast
import hashlib
import io
import pycodestyle
import re
import subprocess
from collections import Counter

def detect_dead_code(tree):
    dead_code = []
    for node in ast.walk(tree):
        if isinstance(node, ast.If):
            if isinstance(node.test, ast.NameConstant) and node.test.value is False:
                dead_code.append((node.lineno, "Bloco 'if False' encontrado"))
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            return_found = False
            for subnode in node.body:
                if isinstance(subnode, ast.Return):
                    return_found = True
                elif return_found:
                    dead_code.append((subnode.lineno, "Código após 'return' encontrado"))
    return dead_code

def detect_duplicate_functions(function_bodies):
    return [names for names in function_bodies.values() if len(names) > 1]

class AnalyzerPython(ast.NodeVisitor):
    def __init__(self):
        self.declared_functions = set()
        self.called_functions = set()
        self.declared_vars = set()
        self.used_vars = set()
        self.print_statements = []
        self.imported_modules = set()
        self.used_names = set()
        self.function_bodies = {}
        self.conditional_calls = set()
        self.function_dependencies = {}
        self.current_function = None
        self.docstring_issues = []
        self.function_complexity = {}
        self.uninitialized_vars = set()
        self.style_issues = []
        self.common_errors = []
        self.refactor_suggestions = []
        self.third_party_code = []

    def visit_Subscript(self, node):
        if isinstance(node.value, ast.Name) and isinstance(node.slice, ast.Index):
            if isinstance(node.slice.value, ast.Num):
                self.common_errors.append((node.lineno, "Possível IndexError detectado."))
        self.generic_visit(node)

    def visit_FunctionDef(self, node):
        self.declared_functions.add(node.name)
        self.current_function = node.name
        self.function_dependencies[node.name] = {"reads": set(), "writes": set()}
        self.function_complexity[node.name] = {"loops": 0, "depth": 0}
        if not ast.get_docstring(node):
            self.docstring_issues.append((node.lineno, f"Função '{node.name}' sem docstring."))
        self._calculate_complexity(node)
        function_body_code = ast.unparse(node)
        function_hash = hashlib.md5(function_body_code.encode()).hexdigest()
        self.function_bodies.setdefault(function_hash, []).append(node.name)
        if self.function_complexity[node.name]["loops"] > 2 or self.function_complexity[node.name]["depth"] > 5:
            self.refactor_suggestions.append(
                (node.lineno, f"Função '{node.name}' é muito complexa. Considere refatorar.")
            )
        self.generic_visit(node)
        self.current_function = None

    def visit_ClassDef(self, node):
        if not ast.get_docstring(node):
            self.docstring_issues.append((node.lineno, f"Classe '{node.name}' sem docstring."))
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            self.called_functions.add(node.func.id)
            if node.func.id == "print":
                self.print_statements.append((node.lineno, ast.unparse(node)))
        self.generic_visit(node)

    def visit_Assign(self, node):
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.declared_vars.add(target.id)
                if self.current_function:
                    self.function_dependencies[self.current_function]["writes"].add(target.id)
        self.generic_visit(node)

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Load):
            if node.id not in self.declared_vars:
                self.uninitialized_vars.add(node.id)
            self.used_vars.add(node.id)
            self.used_names.add(node.id)
            if self.current_function:
                self.function_dependencies[self.current_function]["reads"].add(node.id)

    def visit_Import(self, node):
        for alias in node.names:
            self.imported_modules.add(alias.asname or alias.name)
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        for alias in node.names:
            self.imported_modules.add(alias.asname or alias.name)
        self.generic_visit(node)

    def visit_If(self, node):
        for subnode in ast.walk(node):
            if isinstance(subnode, ast.Call) and isinstance(subnode.func, ast.Name):
                self.conditional_calls.add(subnode.func.id)
        self.generic_visit(node)

    def visit_For(self, node):
        if self.current_function:
            self.function_complexity[self.current_function]["loops"] += 1
        self.generic_visit(node)

    def visit_While(self, node):
        if self.current_function:
            self.function_complexity[self.current_function]["loops"] += 1
        self.generic_visit(node)

    def check_pep8(self, code):
        output = io.StringIO()
        style_checker = pycodestyle.Checker(lines=code.splitlines(), reporter=pycodestyle.StandardReport, stdout=output)
        style_checker.check_all()
        output.seek(0)
        for line in output.readlines():
            self.style_issues.append(line.strip())

    def _calculate_complexity(self, node):
        depth = sum(1 for subnode in ast.walk(node) if isinstance(subnode, ast.Call))
        if self.current_function:
            self.function_complexity[self.current_function]["depth"] = depth

    def check_test_coverage(self, test_path="tests/"):
        try:
            result = subprocess.run(
                ["pytest", "--cov=.", "--cov-report=term-missing", test_path],
                capture_output=True,
                text=True,
            )
            return result.stdout
        except FileNotFoundError:
            return "pytest não está instalado ou não foi encontrado."
        except Exception as e:
            return f"Erro ao executar pytest: {e}"

    def check_performance_issues(self, code):
        performance_issues = []
        for node in ast.walk(ast.parse(code)):
            if isinstance(node, (ast.For, ast.While)):
                for subnode in ast.walk(node):
                    if isinstance(subnode, ast.Call):
                        func_name = (
                            subnode.func.id
                            if isinstance(subnode.func, ast.Name)
                            else ast.unparse(subnode.func)
                        )
                        performance_issues.append(
                            (node.lineno, f"Chamada de função '{func_name}' dentro de loop.")
                        )
            if isinstance(node, (ast.For, ast.While)) and not node.body:
                performance_issues.append(
                    (node.lineno, "Loop vazio detectado.")
                )
        return performance_issues

    def detect_third_party_code(self, code):
        third_party_hashes = {
            "86fb269d190d2c85f6e0468ceca42a20": "Função 'hello_world' de exemplo",
        }
        detected = []
        for node in ast.walk(ast.parse(code)):
            if isinstance(node, ast.FunctionDef):
                function_body_code = ast.unparse(node)
                function_hash = hashlib.md5(function_body_code.encode()).hexdigest()
                if function_hash in third_party_hashes:
                    detected.append(
                        (node.lineno, f"Código de terceiros detectado: {third_party_hashes[function_hash]}")
                    )
        return detected

    def analyze(self, code):
        tree = ast.parse(code)
        self.visit(tree)
        unused_imports = self.imported_modules - self.used_names
        dead_code = detect_dead_code(tree)
        duplicate_functions = detect_duplicate_functions(self.function_bodies)
        unused_writes = {
            func: list(dependencies["writes"] - dependencies["reads"])
            for func, dependencies in self.function_dependencies.items()
        }
        third_party_code = self.detect_third_party_code(code)
        return {
            "declared_functions": list(self.declared_functions),
            "called_functions": list(self.called_functions),
            "unused_functions": list(self.declared_functions - self.called_functions),
            "declared_vars": list(self.declared_vars),
            "used_vars": list(self.used_vars),
            "unused_vars": list(self.declared_vars - self.used_vars),
            "print_statements": self.print_statements,
            "uninitialized_vars": list(self.uninitialized_vars),
            "docstring_issues": self.docstring_issues,
            "function_complexity": self.function_complexity,
            "style_issues": self.style_issues,
            "common_errors": self.common_errors,
            "refactor_suggestions": self.refactor_suggestions,
            "unused_imports": list(unused_imports),
            "dead_code": dead_code,
            "duplicate_functions": duplicate_functions,
            "unused_writes": unused_writes,
            "third_party_code": third_party_code,
        }

class AnalyzerHTML:
    def analyze(self, code):
        void_elements = {
            "area", "base", "br", "col", "embed", "hr", "img", "input",
            "link", "meta", "param", "source", "track", "wbr"
        }
        lines = code.splitlines()
        stack = []
        unclosed_tags = []
        missing_close_tags = []
        incomplete_tags = []
        imgs_without_alt = []
        links_without_href = []
        for i, line in enumerate(lines, 1):
            for m in re.finditer(r'<([a-zA-Z0-9]+)(\s|>|$)', line):
                tag = m.group(1).lower()
                if tag not in void_elements and not line.strip().startswith('</'):
                    if not re.search(r'<%s\b[^>]*>' % tag, line):
                        incomplete_tags.append((line.strip(), i))
                    else:
                        stack.append((tag, i))
            for m in re.finditer(r'</([a-zA-Z0-9]+)>', line):
                tag = m.group(1).lower()
                for idx in range(len(stack)-1, -1, -1):
                    if stack[idx][0] == tag:
                        del stack[idx]
                        break
                else:
                    missing_close_tags.append((tag, i))
            for m in re.finditer(r'<img(?![^>]*\salt=)[^>]*>', line):
                imgs_without_alt.append((m.group(0), i))
            for m in re.finditer(r'<a(?![^>]*\shref=)[^>]*>', line):
                links_without_href.append((m.group(0), i))
            if re.search(r'<([a-zA-Z0-9]+)[^>]*$', line):
                incomplete_tags.append((line.strip(), i))
        for tag, linha in stack:
            unclosed_tags.append((tag, linha))
        ids = re.findall(r'id="([^"]+)"', code)
        id_counts = Counter(ids)
        duplicated_ids = [id_ for id_, count in id_counts.items() if count > 1]
        return {
            "unclosed_tags": unclosed_tags,
            "missing_close_tags": missing_close_tags,
            "incomplete_tags": incomplete_tags,
            "duplicated_ids": duplicated_ids,
            "imgs_without_alt": imgs_without_alt,
            "links_without_href": links_without_href,
        }

class AnalyzerCSS:
    def __init__(self):
        pass

    def analyze(self, code, html_code=None):
        selectors = []
        selector_lines = {}
        invalid_properties = []
        repeated_properties = []
        known_properties = {
            "color", "background", "background-color", "font-size", "font-family", "margin", "padding",
            "border", "border-radius", "width", "height", "display", "position", "top", "left", "right", "bottom",
            "text-align", "line-height", "list-style-type", "max-width", "min-width", "max-height", "min-height",
            "overflow", "z-index", "box-shadow", "opacity", "transition", "cursor", "float", "clear", "padding-left"
        }
        unknown_properties = []
        all_blocks = re.finditer(r'([.#]?[a-zA-Z_][\w\-]*)\s*\{([^}]*)\}', code, re.DOTALL)
        code_lines = code.splitlines()
        for match in all_blocks:
            selector = match.group(1)
            block = match.group(2)
            block_start = match.start(1)
            line_num = code[:block_start].count('\n') + 1
            selectors.append(selector)
            selector_lines.setdefault(selector, []).append(line_num)
            props_seen = set()
            for idx, prop_line in enumerate(block.split('\n')):
                prop_line_strip = prop_line.strip()
                if not prop_line_strip or prop_line_strip.startswith(('/*', '}')):
                    continue
                if ':' not in prop_line_strip:
                    invalid_properties.append((selector, line_num + idx + 1, prop_line_strip))
                    continue
                prop_name = prop_line_strip.split(':', 1)[0].strip()
                if prop_name in props_seen:
                    repeated_properties.append((selector, line_num + idx + 1, prop_name))
                else:
                    props_seen.add(prop_name)
                if prop_name not in known_properties:
                    unknown_properties.append((selector, line_num + idx + 1, prop_name))
        selector_counts = Counter(selectors)
        duplicated_selectors = [sel for sel, count in selector_counts.items() if count > 1]
        invalid_selectors = [sel for sel in selectors if not re.match(r'^[.#]?[a-zA-Z_][\w\-]*$', sel)]
        unused_selectors = []
        if html_code:
            html_classes = set(re.findall(r'class="([^"]+)"', html_code))
            html_classes = set(sum([c.split() for c in html_classes], []))
            html_ids = set(re.findall(r'id="([^"]+)"', html_code))
            for sel in selectors:
                if sel.startswith('.'):
                    if sel[1:] not in html_classes:
                        unused_selectors.append(sel)
                elif sel.startswith('#'):
                    if sel[1:] not in html_ids:
                        unused_selectors.append(sel)
        return {
            "selectors": selectors,
            "selector_lines": selector_lines,
            "duplicated_selectors": duplicated_selectors,
            "invalid_selectors": invalid_selectors,
            "invalid_properties": invalid_properties,
            "repeated_properties": repeated_properties,
            "unknown_properties": unknown_properties,
            "unused_selectors": unused_selectors,
        }

class AnalyzerJavaScript:
    def __init__(self):
        pass

    def analyze(self, code):
        lines = code.splitlines()
        declared_functions = []
        function_lines = {}
        called_functions = []
        declared_variables = []
        variable_lines = {}
        used_variables = set()
        unused_functions = []
        unused_variables = []
        syntax_errors = []
        var_usage = []
        let_usage = []
        const_usage = []
        eval_usage = []
        document_write_usage = []
        todo_comments = []
        long_lines = []
        magic_numbers = []
        semicolon_missing = []
        arrow_functions = []
        anonymous_functions = []
        double_equals = []
        triple_equals = []
        console_log_usage = []
        for i, line in enumerate(lines, 1):
            m = re.match(r'\s*function\s+([a-zA-Z_][\w]*)\s*\(', line)
            if m:
                fname = m.group(1)
                declared_functions.append(fname)
                function_lines[fname] = i
            m = re.match(r'\s*(?:const|let|var)\s+([a-zA-Z_][\w]*)\s*=\s*\(?.*\)?\s*=>', line)
            if m:
                fname = m.group(1)
                declared_functions.append(fname)
                function_lines[fname] = i
                arrow_functions.append((fname, i))
            m = re.match(r'\s*(?:const|let|var)\s+([a-zA-Z_][\w]*)\s*=\s*function\s*\(', line)
            if m:
                fname = m.group(1)
                declared_functions.append(fname)
                function_lines[fname] = i
                anonymous_functions.append((fname, i))
            for var_m in re.finditer(r'\b(?:let|const|var)\s+([a-zA-Z_][\w]*)', line):
                vname = var_m.group(1)
                declared_variables.append(vname)
                variable_lines[vname] = i
            if re.search(r'\bvar\b', line):
                var_usage.append(i)
            if re.search(r'\blet\b', line):
                let_usage.append(i)
            if re.search(r'\bconst\b', line):
                const_usage.append(i)
            if re.search(r'\beval\s*\(', line):
                eval_usage.append(i)
            if re.search(r'document\.write\s*\(', line):
                document_write_usage.append(i)
            if re.search(r'//.*(TODO|FIXME)', line, re.IGNORECASE):
                todo_comments.append((line.strip(), i))
            if len(line) > 120:
                long_lines.append(i)
            for m in re.finditer(r'[^a-zA-Z_](-?\d+(\.\d+)?)', line):
                num = m.group(1)
                if num not in ('0', '1'):
                    magic_numbers.append((num, i))
            if line.strip() and not line.strip().endswith((';', '{', '}', ':')) and not line.strip().startswith('//'):
                if re.search(r'[a-zA-Z0-9\)\]\'\"]$', line.strip()):
                    semicolon_missing.append(i)
            if '==' in line and '===' not in line:
                double_equals.append(i)
            if '===' in line:
                triple_equals.append(i)
            if re.search(r'console\.log\s*\(', line):
                console_log_usage.append(i)
        for i, line in enumerate(lines, 1):
            for m in re.finditer(r'([a-zA-Z_][\w]*)\s*\(', line):
                called_functions.append(m.group(1))
            for m in re.finditer(r'\b([a-zA-Z_][\w]*)\b', line):
                used_variables.add(m.group(1))
        unused_functions = [f for f in declared_functions if f not in called_functions]
        unused_variables = [v for v in declared_variables if v not in used_variables]
        open_braces = sum(line.count('{') for line in lines)
        close_braces = sum(line.count('}') for line in lines)
        if open_braces != close_braces:
            syntax_errors.append(f"Quantidade de '{{' ({open_braces}) diferente de '}}' ({close_braces})")
        open_paren = sum(line.count('(') for line in lines)
        close_paren = sum(line.count(')') for line in lines)
        if open_paren != close_paren:
            syntax_errors.append(f"Quantidade de '(' ({open_paren}) diferente de ')' ({close_paren})")
        return {
            "declared_functions": [(f, function_lines.get(f, None)) for f in declared_functions],
            "unused_functions": [(f, function_lines.get(f, None)) for f in unused_functions],
            "declared_variables": [(v, variable_lines.get(v, None)) for v in declared_variables],
            "unused_variables": [(v, variable_lines.get(v, None)) for v in unused_variables],
            "syntax_errors": syntax_errors,
            "var_usage": var_usage,
            "let_usage": let_usage,
            "const_usage": const_usage,
            "eval_usage": eval_usage,
            "document_write_usage": document_write_usage,
            "todo_comments": todo_comments,
            "long_lines": long_lines,
            "magic_numbers": magic_numbers,
            "semicolon_missing": semicolon_missing,
            "arrow_functions": arrow_functions,
            "anonymous_functions": anonymous_functions,
            "double_equals": double_equals,
            "triple_equals": triple_equals,
            "console_log_usage": console_log_usage,
        }

def analyze_code(code):
    analyzer = AnalyzerPython()
    return analyzer.analyze(code)

code = """
def hello_world():
    print("Hello, world!")
"""
function_hash = hashlib.md5(code.strip().encode()).hexdigest()
print(function_hash)
