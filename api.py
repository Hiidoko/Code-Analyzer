from flask import Flask, request, jsonify
from flask_cors import CORS
from analyzer import AnalyzerHTML, AnalyzerCSS, AnalyzerJavaScript, analyze_code

app = Flask(__name__)
CORS(app)

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    code = data.get("code", "")
    filetype = data.get("filetype", "py")

    if filetype == "py":
        result = analyze_code(code)
    elif filetype == "html":
        result = AnalyzerHTML().analyze(code)
    elif filetype == "css":
        result = AnalyzerCSS().analyze(code)
    elif filetype == "js":
        result = AnalyzerJavaScript().analyze(code)
    else:
        return jsonify({"error": "Tipo de arquivo não suportado."}), 400

    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)