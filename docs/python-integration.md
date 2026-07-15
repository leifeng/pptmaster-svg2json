# Python Integration Guide — svg2json CLI

Python 通过 `subprocess` 调用 `node svg2json/cli.js` 执行转换。

---

## CLI 用法

```bash
node svg2json/cli.js <input>           # 单文件 → stdout
node svg2json/cli.js <input> -o out.json   # 单文件 → 指定输出
node svg2json/cli.js <dir>             # 目录批量 → *.svg.json
node svg2json/cli.js <dir> -r          # 递归批量
```

**行为：**
- 目录模式下输出到同目录 `.svg.json` 文件
- `--output` 不能用于目录输入
- 部分失败仍 exit 0，错误输出到 stderr
- 统计格式：`Converted N files, M failed`

---

## Python 调用

```python
import subprocess
import json
from pathlib import Path

def convert_svg(svg_path: str) -> dict | None:
    """单文件转换，返回 JSON dict 或 None"""
    result = subprocess.run(
        ["node", "svg2json/cli.js", svg_path],
        capture_output=True, text=True,
        cwd="脚本所在目录"
    )
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def batch_convert(directory: str, recursive: bool = False) -> dict[str, dict]:
    """目录批量转换，返回 {svg_path: json_data}"""
    cmd = ["node", "svg2json/cli.js", directory]
    if recursive:
        cmd.append("-r")

    subprocess.run(cmd, capture_output=True, text=True, cwd="脚本所在目录")

    results = {}
    pattern = Path(directory).rglob("*.svg") if recursive else Path(directory).glob("*.svg")
    for svg_file in pattern:
        json_file = Path(str(svg_file) + ".json")
        if json_file.exists():
            with open(json_file, encoding="utf-8") as f:
                results[str(svg_file)] = json.load(f)
    return results
```

---

## 示例

```python
# 单文件
result = convert_svg("input.svg")

# 目录批量
results = batch_convert("my-svgs", recursive=True)
for path, data in results.items():
    print(f"{path}: {len(data.get('slides', []))} slides")
```

---

## 错误处理

| 情况 | exit code | Python |
|------|-----------|--------|
| 单文件无效 SVG | 1 | 返回 None |
| 目录部分失败 | 0 | 部分结果 |
| 文件不存在 | 1 | 返回 None |

---

## 要求

- Node.js 已安装
- 在项目根目录 `脚本所在目录` 下执行