JSB.newAddon = function (mainPath) {
  JSB.require('SettingsViewController');
  var smartNL = JSB.defineClass(
    'smartNoteLang : JSExtension',
    {
      sceneWillConnect: function () {
        self.settingsViewController = SettingsViewController.new();
        self.settingsViewController.mainPath = mainPath;

        NSNotificationCenter.defaultCenter().addObserverSelectorName(
          self,
          "onProcessExcerptText:",
          "ProcessNewExcerpt"
        );
      },
      
      notebookWillOpen: function(notebookid) {},

      notebookWillClose: function (notebookid) {
        if(self.settingsViewController.view.window){
          self.settingsViewController.view.removeFromSuperview();
          self.settingsOpen = false
        }
      },

      controllerWillLayoutSubviews: function(controller) {
        if(controller == Application.sharedInstance().studyController(self.window)){
            self.layoutViewController();
        }
      },

      queryAddonCommandStatus: function () {
        if (Application.sharedInstance().studyController(self.window).studyMode < 3)
          return {
            image: 'icon.png',
            object: self,
            selector: 'toggleSettingsView:',
            checked: self.settingsViewController.view.window ? true : false
          };
        return null;
      },

      toggleSettingsView: function (sender) {
        if(self.settingsViewController.view.window){
          self.settingsViewController.view.removeFromSuperview();
          self.settingsOpen = false
        }
        else{
          Application.sharedInstance().studyController(self.window).view.addSubview(self.settingsViewController.view);        
          self.layoutViewController();
          self.settingsOpen = true
          NSTimer.scheduledTimerWithTimeInterval(0.2,false,function(){ 
            Application.sharedInstance().studyController(self.window).becomeFirstResponder();
          });
        }
        Application.sharedInstance().studyController(self.window).refreshAddonCommands();
      },

      onProcessExcerptText: function (sender) {
        const userDefaults = NSUserDefaults.standardUserDefaults();

        if (!userDefaults.objectForKey("autogen_enabled")) return;
        if (!Application.sharedInstance().checkNotifySenderInWindow(sender, self.window)) return;

        const apiKey = userDefaults.objectForKey("openai_api_key");
        if (!apiKey) {
          self.showHUD("⚠️ API 키가 설정되어 있지 않습니다.");
          return;
        }

        try {
          const noteId = sender.userInfo.noteid;
          const note = Database.sharedInstance().getNoteById(noteId);

          if (!note || !note.excerptText || note.groupNoteId) {
            self.showHUD("⚠️ 올바르지 않은 발췌입니다.");
            return;
          }

          const excerptText = note.excerptText.trim();
          if (excerptText.length === 0) {
            self.showHUD("⚠️ 발췌된 텍스트가 없습니다.");
            return;
          }

          const wordCount = excerptText.split(/\s+/).length;

          // 언어 및 유형 판별 (임시로 영어가 아닌 경우엔 일본어로 연결)
          if (!self.isMostlyEnglish(excerptText)) {
            self.fetchStudyData(apiKey, excerptText, note, self.JP_SYSTEM_PROMPT, self.applyJapaneseAIResult);
          } else if (wordCount === 1) {
            self.fetchStudyData(apiKey, excerptText, note, self.EN_WORD_SYSTEM_PROMPT, self.applyWordAIResult);
          } else {
            self.fetchStudyData(apiKey, excerptText, note, self.EN_SENTENCE_SYSTEM_PROMPT, self.applySentenceAIResult);
          }
        } catch (err) {
          self.showHUD(`❌ 예외 발생: ${err}`);
        }
      },
    },
    {
      addonDidConnect: function () {},
      addonWillDisconnect: function () {}
    }
  );

  smartNL.prototype.fetchStudyData = function (key, input, note, systemPrompt, applyAIResult) {
    try {
      const url = NSURL.URLWithString("https://api.openai.com/v1/chat/completions");
      const request = NSMutableURLRequest.requestWithURL(url);
      request.setHTTPMethod("POST");
      request.setValueForHTTPHeaderField("application/json", "Content-Type");
      request.setValueForHTTPHeaderField(`Bearer ${key}`, "Authorization");

      const body = {
        model: "gpt-4o",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input }
        ]
      };

      const jsonData = JSON.stringify(body);
      request.setHTTPBody(NSJSONSerialization.dataWithJSONObjectOptions(JSON.parse(jsonData), 0));

      NSURLConnection.sendAsynchronousRequestQueueCompletionHandler(
        request,
        NSOperationQueue.mainQueue(),
        function (response, data, error) {
          try {
            const responseJson = NSJSONSerialization.JSONObjectWithDataOptions(data, 0);

            if (responseJson.error?.code === "invalid_api_key") {
              self.showHUD("⚠️ 잘못된 OpenAI API 키입니다.");
              return;
            }

            if (response.statusCode() !== 200 && error || !data) {
              self.showHUD(`❌ API 응답 오류: ${error || "데이터 없음"}`);
              return;
            }

            const rawContent = responseJson.choices?.[0]?.message?.content;
            if (!rawContent) {
              self.showHUD("⚠️ 응답에 content가 없습니다.");
              return;
            }

            // Markdown 블록 제거: "```json\n{...}\n```"
            const cleaned = rawContent.replace(/```json|```/gi, "").trim();
            const parsedJson = JSON.parse(cleaned);

            applyAIResult(parsedJson, note);

          } catch (parseErr) {
            self.showHUD(`⚠️ JSON 파싱 실패: ${parseErr}`);
          }
        }
      );
    } catch (requestErr) {
      self.showHUD(`⚠️ 요청 실패: ${requestErr}`);
    }
  };

  smartNL.prototype.applyJapaneseAIResult = function (json, note) {
    try {
      const reading = json.reading || "";
      const translation = json.translation_ko || "";
      const explanation = json.explanation || "";

      const comment = [
        reading ? `📖 읽는 법: ${reading}` : "",
        translation ? `🇰🇷 해석: ${translation}` : "",
        explanation ? `🔍 설명: ${explanation}` : ""
      ].filter(Boolean).join("\n\n");

      UndoManager.sharedInstance().undoGrouping("JPParser", note.notebookId, function () {
        note.noteTitle = note.excerptText;
        note.excerptText = comment;
        Database.sharedInstance().setNotebookSyncDirty(note.notebookId);
      });

      NSNotificationCenter.defaultCenter().postNotificationNameObjectUserInfo(
        "RefreshAfterDBChange", self, { topicid: note.notebookId }
      );
    } catch (err) {
      self.showHUD(`⚠️ 일본어 카드 변환 실패: ${err}`);
    }
  };

  smartNL.prototype.applyWordAIResult = function (json, note) {
    try {
      const lemma = json.lemma || "";
      const inflections = Array.isArray(json.inflections)
        ? json.inflections.map(f => f.form).join("; ")
        : "";

      const title = [lemma, inflections].filter(Boolean).join("; ");

      const labelBlock = Array.isArray(json.inflections)
        ? json.inflections.map(f => `• ${f.form} [${f.label}]`).join("\n")
        : "";

      const defs = Array.isArray(json.definitions)
        ? json.definitions.map(d => `- ${d}`).join("\n")
        : "";

      const examples = Array.isArray(json.examples)
        ? json.examples.map(e => `• ${e.en}\n(${e.ko})`).join("\n\n")
        : "";

      const comment = [
        labelBlock ? `🌀 활용형:\n${labelBlock}` : "",
        defs ? `📘 정의:\n${defs}` : "",
        examples ? `💬 예문:\n${examples}` : ""
      ].filter(Boolean).join("\n\n");

      UndoManager.sharedInstance().undoGrouping('Lemmatizer', note.notebookId, function () {
        note.noteTitle = title;
        note.excerptText = comment;
        Database.sharedInstance().setNotebookSyncDirty(note.notebookId);
      });

      NSNotificationCenter.defaultCenter().postNotificationNameObjectUserInfo(
        'RefreshAfterDBChange', self, { topicid: note.notebookId }
      );
    } catch (err) {
      self.showHUD(`⚠️ 단어 카드 변환 실패: ${err}`);
    }
  };

  smartNL.prototype.applySentenceAIResult = function (json, note) {
    try {
      const title = note.excerptText;
      const grammarPoint = json.grammar_point || "";
      const explanation = json.explanation_ko || "";

      const examples = Array.isArray(json.examples)
        ? json.examples.map(e => `${e.en}\n${e.ko}`).join("\n\n")
        : "";

      const tips = Array.isArray(json.toeic_tips)
        ? json.toeic_tips.map(t => `• ${t}`).join("\n")
        : "";

      const comment = [
        `🔹 문법 포인트: ${grammarPoint}`,
        `🔸 설명: ${explanation}`,
        examples ? `📘 예문:\n${examples}` : "",
        tips ? `💡 TOEIC 팁:\n${tips}` : ""
      ].filter(Boolean).join("\n\n");

      UndoManager.sharedInstance().undoGrouping('SentenceParser', note.notebookId, function () {
        note.noteTitle = title;
        note.excerptText = comment;
        Database.sharedInstance().setNotebookSyncDirty(note.notebookId);
      });

      NSNotificationCenter.defaultCenter().postNotificationNameObjectUserInfo(
        'RefreshAfterDBChange', self, { topicid: note.notebookId }
      );
    } catch (err) {
      self.showHUD(`⚠️ 문장 카드 변환 실패: ${err}`);
    }
  };

  smartNL.prototype.EN_WORD_SYSTEM_PROMPT = `you're a toeic vocab bot. for a given english word, return only valid json:{"lemma":"base form","inflections":[{"form":"...(en)","label":"korean grammatical form only (no meaning)"}...],"definitions":["detailed korean meaning (toeic-relevant)"],"examples":[{"en":"example","ko":"translation"}]}use toeic business/email/schedule context. return only json. no markdown or extra text.`.trim();
  smartNL.prototype.EN_SENTENCE_SYSTEM_PROMPT =`you're a toeic english tutor. given an english sentence, return only valid json in this format:{"grammar_point":"grammar name","explanation_ko":"korean explanation","examples":[{"en":"example sentence","ko":"korean translation"},...],"toeic_tips":["tip 1","tip 2",...]} the examples must use the same grammar. explanations and tips must be in korean. return only json. no markdown or extra text.`.trim();
  smartNL.prototype.JP_SYSTEM_PROMPT = `you're a japanese tutor for beginner to intermediate learners. given a japanese word or sentence, respond only in valid json:{"reading":"hiragana reading (if kanji present)","translation_ko":"korean translation","explanation":"clear and informative korean explanation of grammar, usage, and structure"} the explanation must focus on grammar points. return only json. no markdown or extra text.`.trim();
  
  // 설정 flag
  smartNL.prototype.settingsOpen = false

  // settings view
  smartNL.prototype.layoutViewController = function(){
    var frame = Application.sharedInstance().studyController(self.window).view.bounds;
    var width = 380;
    self.settingsViewController.view.frame = {x:(frame.width-width)/2,y:((frame.height)/2 - 150),width:width,height:229};
  };

  smartNL.prototype.isMostlyEnglish = function(text){
    const englishCharCount = (text.match(/[a-zA-Z]/g) || []).length;
    return englishCharCount / text.length > 0.6;  // 60% 이상이면 영어로 간주
  }

  smartNL.prototype.showHUD = function(text){
    Application.sharedInstance().showHUD(text, self.window, 2);
  }

  return smartNL;
};
