#!/usr/bin/env python3
"""Build a filtered securities-practice bank from DXM-AGI/FIRE-Bench.

Upstream dataset: https://github.com/DXM-AGI/FIRE-Bench
License: Apache-2.0

The generated browser asset is intentionally not committed. GitHub Pages builds it from
upstream on every deployment. We keep only the securities-qualification subset and apply
basic staleness/format filters before exposing it to the study UI.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/DXM-AGI/FIRE-Bench/main/dataset/FIRE/FIRE.json"
OUT = Path("site/quiz-v4/fire-securities-v491.js")
BENCHMARK = "finance_证券从业资格证"
SOURCE_URL = "https://github.com/DXM-AGI/FIRE-Bench"

LAW_KEYWORDS = [
    "公司法", "证券法", "合伙企业", "法律法规", "证券公司", "从业人员", "合规",
    "违法", "犯罪", "处罚", "监管", "证监会", "证券业协会", "信息披露", "发行上市",
    "保荐", "内幕交易", "操纵市场", "客户资产", "洗钱", "董事", "监事", "股东",
    "执业", "自律", "反洗钱", "适当性", "投资者保护", "风险控制指标", "净资本",
    "经纪业务", "承销", "保荐业务", "资产管理业务", "融资融券", "证券自营"
]

STALE_PHRASES = [
    "银保监会", "保监会", "工商行政管理", "货币出资金额不得低于", "一人有限责任公司",
    "注册资本最低限额", "验资证明", "《民法通则》", "证券从业资格考试合格证书"
]

TOPIC_RULES = [
    (["公司法", "股东", "董事", "监事", "公司章程"], "公司法与公司治理"),
    (["证券法", "证券发行", "证券上市", "信息披露"], "证券法与发行交易制度"),
    (["证券公司", "净资本", "风险控制指标"], "证券公司治理与风险控制"),
    (["经纪业务", "证券账户", "客户交易结算资金"], "证券经纪业务"),
    (["承销", "保荐"], "证券承销与保荐"),
    (["融资融券"], "融资融券业务"),
    (["资产管理"], "证券资产管理业务"),
    (["自营"], "证券自营业务"),
    (["内幕交易", "操纵市场", "未公开信息"], "证券市场违法行为"),
    (["从业人员", "执业", "证券业协会", "诚信"], "证券从业人员与自律管理"),
    (["基金", "基金管理人", "基金托管人"], "证券投资基金"),
    (["股票", "普通股", "优先股"], "股票"),
    (["债券", "国债", "公司债", "企业债"], "债券"),
    (["金融衍生", "期货", "期权", "互换", "远期"], "金融衍生工具"),
    (["证券交易所", "交易所市场", "场内市场", "场外市场"], "证券交易市场"),
    (["货币政策", "中央银行", "存款准备金", "公开市场操作"], "中央银行与货币政策"),
    (["金融市场", "直接融资", "间接融资"], "金融市场体系"),
    (["风险", "VaR", "流动性风险", "信用风险", "市场风险"], "金融风险管理"),
    (["收益率", "利率", "久期", "凸性"], "利率与债券定价"),
    (["资产证券化", "ABS"], "资产证券化"),
    (["存托凭证", "DR"], "存托凭证"),
]


def fetch_json() -> list[dict]:
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(URL, headers={"User-Agent": "freovia-exam-bank-builder/1.0"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as exc:  # pragma: no cover - workflow diagnostic path
            last = exc
            if attempt < 3:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"failed to fetch FIRE dataset: {last}")


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def parse_question(raw: str, gold: str):
    text = (raw or "").replace("\r", "").strip()
    text = re.sub(r"^问题[:：]\s*", "", text)
    text = re.sub(r"\n\s*答[:：]\s*$", "", text)
    lines = [x.strip() for x in text.split("\n") if x.strip()]
    option_start = None
    for i, line in enumerate(lines):
        if re.match(r"^[A-D][.．、]\s*", line):
            option_start = i
            break
    if option_start is None:
        return None
    stem = normalize(" ".join(lines[:option_start]))
    options = []
    current = None
    for line in lines[option_start:]:
        m = re.match(r"^([A-D])[.．、]\s*(.*)$", line)
        if m:
            if current is not None:
                options.append(normalize(current))
            current = m.group(2)
        elif current is not None:
            current += " " + line
    if current is not None:
        options.append(normalize(current))
    if not stem or not (2 <= len(options) <= 4):
        return None
    letters = [c for c in (gold or "").upper() if c in "ABCD"]
    ans = sorted({ord(c) - 65 for c in letters if ord(c) - 65 < len(options)})
    if not ans:
        return None
    return stem, options, ans


def is_law(stem: str) -> bool:
    return any(k in stem for k in LAW_KEYWORDS)


def topic_for(stem: str) -> str:
    for words, topic in TOPIC_RULES:
        if any(w in stem for w in words):
            return topic
    return "证券市场综合知识"


def stale(stem: str, law: bool) -> bool:
    if re.search(r"(?:201[0-9]|202[0-2])年真题", stem):
        return True
    if any(p in stem for p in STALE_PHRASES):
        return True
    # 2024 Company Law materially changed a number of old memorisation rules.
    if law and "公司法" in stem:
        return True
    if law and re.search(r"20(?:0[0-9]|1[0-9]|2[0-2])年", stem):
        return True
    return False


def make_item(stem: str, options: list[str], ans: list[int], idx: int) -> dict:
    law = is_law(stem)
    subject = "law" if law else "finance"
    topic = topic_for(stem)
    digest = hashlib.sha1((stem + "|" + "|".join(options)).encode("utf-8")).hexdigest()[:12]
    letters = "、".join(chr(65 + x) for x in ans)
    qtype = "multi" if len(ans) > 1 else "single"
    oa = []
    for i, opt in enumerate(options):
        if i in ans:
            oa.append(f"FIRE-Bench 给定答案包含该项（{chr(65+i)}）。本题需结合“{topic}”的定义、主体、适用范围和条件判断。")
        else:
            oa.append(f"FIRE-Bench 给定答案不包含该项（{chr(65+i)}）。复习时应核对它与“{topic}”在概念、主体、范围或条件上的差异。")
    return {
        "id": f"FIRE491-{digest}",
        "s": subject,
        "ch": topic,
        "knowledge": topic,
        "type": qtype,
        "q": stem,
        "o": options,
        "a": ans,
        "e": f"本题直接取自 FIRE-Bench 的证券从业资格证题集，题库给定答案为 {letters}。开放题源不含逐题官方解析；本站将其作为真题风格练习题使用，法规敏感内容已做第一轮过时规则过滤。",
        "oa": oa,
        "learn": {
            "definition": f"本题考查“{topic}”。先确认题干要求的是定义、主体、范围、程序、数量条件还是例外情形，再匹配选项。",
            "key": "先看题干限定词（正确/错误/不包括/属于/应当），再逐项核对，不要只凭某个关键词或绝对化措辞作答。",
            "wrong": "常见失分来自把相近概念、不同监管主体、不同市场层级或不同业务边界混为一谈。",
            "falsekey": "FIRE-Bench 属开放评测题源，并非中国证券业协会官方真题库；涉及现行法规、期限、比例和处罚金额时，以最新官方规则为准。"
        },
        "sourceTruth": "开源证券从业题库",
        "sourceBasis": "DXM-AGI/FIRE-Bench · finance_证券从业资格证 · Apache-2.0",
        "sourceUrl": SOURCE_URL,
        "sourcePublisher": "DXM-AGI/FIRE-Bench",
        "sourceLicense": "Apache-2.0",
        "sourceFreshness": "filtered-open-source",
        "sourceIndex": idx,
        "strict": True,
        "quizEligible": True,
        "qualityTier": "SOURCE"
    }


def main() -> int:
    rows = fetch_json()
    seen = set()
    out = []
    skipped_parse = skipped_stale = skipped_dup = 0
    for idx, row in enumerate(rows):
        if row.get("benchmark") != BENCHMARK:
            continue
        parsed = parse_question(row.get("question", ""), row.get("gold", ""))
        if not parsed:
            skipped_parse += 1
            continue
        stem, options, ans = parsed
        law = is_law(stem)
        if stale(stem, law):
            skipped_stale += 1
            continue
        sig = re.sub(r"[\s，。！？、；：,.!?;:（）()“”\"'《》「」]", "", stem).lower()
        if sig in seen:
            skipped_dup += 1
            continue
        seen.add(sig)
        out.append(make_item(stem, options, ans, idx))

    meta = {
        "version": "4.9.1",
        "upstream": SOURCE_URL,
        "license": "Apache-2.0",
        "count": len(out),
        "finance": sum(x["s"] == "finance" for x in out),
        "law": sum(x["s"] == "law" for x in out),
        "skippedParse": skipped_parse,
        "skippedStale": skipped_stale,
        "skippedDuplicate": skipped_dup,
        "policy": "FIRE securities subset; explicit-old/stale filters; current-law-sensitive items require ongoing audit"
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = (
        "/* Generated from DXM-AGI/FIRE-Bench (Apache-2.0). Do not edit by hand. */\n"
        "window.SEC_FIRE_V491=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
        "window.SEC_FIRE_META_V491=" + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    OUT.write_text(payload, encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=2))
    if len(out) < 500:
        print("ERROR: filtered FIRE bank unexpectedly small", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
