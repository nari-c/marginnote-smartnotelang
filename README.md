# 📘 SmartNoteLang (SmartNL)

**SmartNL**은 MarginNote 한국어 사용자들을 위한 언어 학습 보조 애드온입니다.  
영어 또는 일본어로 된 텍스트를 발췌하면, AI가 해당 내용을 자동 분석하여 노트에 학습 정보를 카드 형태로 추가해줍니다.

---

### 🎯 목적

> SmartNL은 사용자의 영어/일본어 학습을 보조하기 위해 설계되었습니다.  
> 단어와 문장을 발췌하는 것만으로도 문법 설명, 예문, 번역 등을 자동으로 받아볼 수 있어  
> 문서를 읽으면서 효율적으로 어휘와 문형을 학습할 수 있습니다.

---

### ▶️ 사용 예시

영어 단어/문장을 발췌했을 때 자동으로 카드가 생성되는 예시입니다.

![Usage Example](docs/usage-example.gif)

---

### ⚙️ 사용 방법

1. Marginnote에서 import 후 SmartNL 아이콘을 눌러 **OpenAI API Key**를 입력합니다. *(API 요금 사용자 부담)*
2. 문서에서 **텍스트를 발췌**하면, 해당 텍스트에 맞는 언어 및 유형을 자동 감지하여 AI 요청을 보냅니다.  
3. 응답된 결과는 자동으로 노트에 카드 형태로 생성됩니다.

---

### 💡 작동 방식 요약

- **영어**:  
  - 발췌된 텍스트가 영어 단어일 경우 → 어형/의미/예문 중심 카드 생성  
  - 문장일 경우 → 문법 포인트/설명/TOEIC 팁 중심 카드 생성  
- **일본어**:  
  - 일본어는 일반적으로 띄어쓰기가 없기 때문에 **단어/문장 구분 없이 처리**됩니다.  
  - 히라가나 읽기, 번역, 문법 설명 중심 카드가 생성됩니다.

---

### 🛠 고급 설정: 프롬프트 커스터마이징

SmartNL은 기본적으로 다음과 같은 학습 수준을 기준으로 동작합니다:

- **영어**: TOEIC 스타일의 비즈니스/이메일/스케줄 관련 단어와 문장 중심  
- **일본어**: 초급~중급 학습자를 위한 문법 설명 및 구조 분석

그러나, SmartNL은 내부의 시스템 프롬프트를 수정하여  
**사용자의 학습 수준에 맞게 자유롭게 커스터마이징이 가능합니다.**

#### ✏️ 수정 방법

- `main.js` 또는 관련 스크립트 내에 정의된 다음 항목을 편집하세요:

```js
smartNL.prototype.EN_WORD_SYSTEM_PROMPT
smartNL.prototype.EN_SENTENCE_SYSTEM_PROMPT
smartNL.prototype.JP_SYSTEM_PROMPT
```

- 예시:
  - TOEIC 대신 **SAT/TOEFL 스타일 단어**로 변경하고 싶을 경우  
    → `"toeic-relevant"` → `"academic/scholarly"` 등으로 교체
  - 일본어 프롬프트에 **예문 추가**나 **N1 문형 강조** 등의 지시를 추가할 수 있음

> 📌 단, 수정 시에는 반드시 **JSON 형식 요구 조건**  
> (`return only json`, `no markdown`)을 유지해야 정상 작동합니다.

---

<br><br><br><br>

## 📦 AI response JSON 포맷 명세

SmartNL은 발췌된 텍스트에 따라 OpenAI API로부터 다음과 같은 **JSON 형식의 응답**을 받아 노트에 반영합니다.  
발췌 유형에 따라 아래와 같은 포맷이 사용됩니다.

---

### 🇺🇸 English Word Mode (단어 발췌 시)

**System Prompt 요약:**  
> TOEIC 단어 학습용 봇으로, 입력된 영어 단어에 대해 lemma, inflections, 한국어 정의와 예문을 JSON으로 반환

**Expected JSON Format:**
```json
{
  "lemma": "base form",
  "inflections": [
    { "form": "inflected form", "label": "korean grammatical label" }
  ],
  "definitions": [
    "korean definition (toeic-relevant)"
  ],
  "examples": [
    { "en": "example sentence", "ko": "korean translation" }
  ]
}
```

**Example:**
```json
{
  "lemma": "schedule",
  "inflections": [
    { "form": "schedules", "label": "3인칭 단수 현재형" },
    { "form": "scheduled", "label": "과거형" }
  ],
  "definitions": [
    "일정, 예정, 계획을 나타내는 명사 또는 동사"
  ],
  "examples": [
    { "en": "I have a tight schedule today.", "ko": "나는 오늘 일정이 빡빡하다." }
  ]
}
```

---

### 🇺🇸 English Sentence Mode (문장 발췌 시)

**System Prompt 요약:**  
> TOEIC 영어 튜터 역할로, 문장 내 문법 요소, 설명, 예문, 팁을 포함한 JSON 반환

**Expected JSON Format:**
```json
{
  "grammar_point": "grammar name",
  "explanation_ko": "korean explanation",
  "examples": [
    { "en": "example sentence", "ko": "korean translation" }
  ],
  "toeic_tips": [
    "korean tip 1", "korean tip 2"
  ]
}
```

**Example:**
```json
{
  "grammar_point": "Present Perfect",
  "explanation_ko": "현재완료는 과거에 시작되어 현재까지 영향을 주는 동작이나 경험을 나타냄.",
  "examples": [
    { "en": "I have worked here for five years.", "ko": "나는 여기서 5년간 일했다." }
  ],
  "toeic_tips": [
    "기간 표현(for/since)과 자주 함께 쓰임",
    "업무 경력, 고객 응대 상황에서 자주 등장"
  ]
}
```

---

### 🇯🇵 Japanese Mode (일본어 발췌 시)

**System Prompt 요약:**  
> 초중급 일본어 튜터 역할로, 히라가나 읽기, 번역, 문법 설명을 포함한 JSON 반환

**Expected JSON Format:**
```json
{
  "reading": "hiragana reading (if kanji present)",
  "translation_ko": "korean translation",
  "explanation": "clear and informative korean explanation of grammar, usage, and structure"
}
```

**Example:**
```json
{
  "reading": "たべている",
  "translation_ko": "먹고 있다",
  "explanation": "~ている는 동작이 현재 진행 중임을 나타내며, 동사의 て형에 いる를 붙여 만든다."
}
```

---

> 모든 응답은 **valid JSON only** 형식으로 반환됩니다. 


## 📄 License

SmartNoteLang is open source and distributed under the terms of the [MIT License](LICENSE),  
which permits commercial use, modification, distribution, and private use.