var SettingsViewController = JSB.defineClass('SettingsViewController : UITableViewController', {
  viewDidLoad: function () {
    self.view.layer.cornerRadius = 10;
    self.view.layer.borderWidth = 1;
    self.view.layer.borderColor = UIColor.colorWithWhiteAlpha(0.5,1);

    self.navigationItem.title = 'Settings';

    var naviTitle = new UILabel({ x: 20, y: 20, width: 340, height: 30 });
    naviTitle.text = "SmartNL Settings";
    naviTitle.textColor = UIColor.blackColor();
    naviTitle.font = UIFont.systemFontOfSize(21);
    self.view.addSubview(naviTitle);

    var autogenTitle = new UILabel({ x: 20, y: 60, width: 10, height: 10 });
    autogenTitle.text = "- AI 카드 자동 생성";
    autogenTitle.textColor = UIColor.blackColor();
    autogenTitle.font = UIFont.systemFontOfSize(15);
    autogenTitle.sizeToFit()
    self.view.addSubview(autogenTitle);

    var autogenSwitch = new UISwitch({ x: autogenTitle.frame.width + 30, y: 60, width: 10, height: 10 });
    var autogenSwitchValue = NSUserDefaults.standardUserDefaults().objectForKey("autogen_enabled");
    autogenSwitch.setOnAnimated(autogenSwitchValue == true, true);
    autogenSwitch.addTargetActionForControlEvents(self, "onToggleAutoGen:", 1 << 12);
    autogenSwitch.backgroundColor = UIColor.clearColor();
    autogenSwitch.sizeToFit()
    autogenSwitch.tag = 20250725;
    self.view.addSubview(autogenSwitch);

    var autogenDescription = new UILabel({ x: 20, y: autogenTitle.frame.height + 65, width: 10, height: 10 });
    autogenDescription.text = "발췌 시 영어 단어/문장 또는 일본어를 AI자동 분석 후 카드를 생성합니다.";
    autogenDescription.textColor = UIColor.blackColor();
    autogenDescription.font = UIFont.systemFontOfSize(12);
    autogenDescription.sizeToFit()
    self.view.addSubview(autogenDescription);

    var apiKeyTitle = new UILabel({ x: 20, y: 120, width: 10, height: 10 });
    apiKeyTitle.text = "- Key 설정";
    apiKeyTitle.textColor = UIColor.blackColor();
    apiKeyTitle.font = UIFont.systemFontOfSize(15);
    apiKeyTitle.sizeToFit()
    self.view.addSubview(apiKeyTitle);

    var apiKeyField = new UITextField({ x: 20, y: 130 + apiKeyTitle.frame.height, width: 340, height: 30 });
    var savedKey = NSUserDefaults.standardUserDefaults().objectForKey("openai_api_key") || "";
    apiKeyField.textColor = UIColor.blackColor();
    apiKeyField.placeholder = "OpenAI API Key를 입력하세요";
    apiKeyField.backgroundColor = UIColor.whiteColor();
    apiKeyField.borderStyle = 1;
    apiKeyField.tag = 20250711;
    apiKeyField.text = savedKey;
    self.view.addSubview(apiKeyField);

    var frame = {x: 20, y: 160 + apiKeyTitle.frame.height, width: 10, height: 10};
    var linkButton = new UIButton(frame)
    linkButton.contentVerticalAlignment = 0;
    linkButton.contentHorizontalAlignment = 1;
    linkButton.setTitleForState("OpenAI 사이트 열기", 0);
    linkButton.setTitleColorForState(UIColor.grayColor(), 0);
    linkButton.backgroundColor = UIColor.clearColor();
    linkButton.tag = 2;
    linkButton.addTargetActionForControlEvents(self, "onOpenLink:", 1 << 6);
    linkButton.sizeToFit()
    self.view.addSubview(linkButton)

    var frame = {x: 280, y: 160 + apiKeyTitle.frame.height, width: 80, height: 30};
    var saveButton = new UIButton(frame)
    saveButton.contentVerticalAlignment = 0;
    saveButton.contentHorizontalAlignment = 0;
    saveButton.setTitleForState("키 저장하기", 0);
    saveButton.setTitleColorForState(UIColor.blackColor(), 0);
    saveButton.backgroundColor = UIColor.colorWithWhiteAlpha(0.9,1);;
    saveButton.tag = 1;
    saveButton.addTargetActionForControlEvents(self, "onSave:", 1 << 6);
    self.view.addSubview(saveButton)
  },
  onToggleAutoGen: function(sender) {
    var isOn = sender.on;

    NSUserDefaults.standardUserDefaults().setObjectForKey(isOn, "autogen_enabled");
    Application.sharedInstance().showHUD(
      isOn ? "✅ 자동 생성 활성화" : "⛔ 자동 생성 비활성화",
      self.view.window,
      1.5
    );
  },
  onSave: function (sender) {
    var input = self.view.viewWithTag(20250711);
    var key = input.text;

    // key.length 임시
    if (key && key.length > 10) {
      NSUserDefaults.standardUserDefaults().setObjectForKey(key, "openai_api_key");
      Application.sharedInstance().showHUD("✅ API Key 저장됨", self.view.window, 2);
    } else {
      Application.sharedInstance().showHUD("⚠️ 유효하지 않은 키", self.view.window, 2);
    }
  },
  onOpenLink: function (sender) {
    var url = NSURL.URLWithString("https://platform.openai.com");
    Application.sharedInstance().openURL(url);
  }
});

SettingsViewController.prototype.test = true