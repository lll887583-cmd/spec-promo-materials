(function () {
  'use strict';

    const materialSizes = [
      { id: 'ad_120x600', label: '120 x 600', width: 120, height: 600 },
      { id: 'ad_160x600', label: '160 x 600', width: 160, height: 600 },
      { id: 'ad_300x600', label: '300 x 600', width: 300, height: 600 },
      { id: 'ad_320x480', label: '320 x 480', width: 320, height: 480 },
      { id: 'ad_628x1200', label: '628 x 1200', width: 628, height: 1200 },
      { id: 'ad_828x1200', label: '828 x 1200', width: 828, height: 1200 },
      { id: 'ad_1200x1500', label: '1200 x 1500', width: 1200, height: 1500 },
      { id: 'ad_300x250', label: '300 x 250', width: 300, height: 250 },
      { id: 'square_800x800', label: '800 x 800', width: 800, height: 800 },
      { id: 'ad_1200x1200', label: '1200 x 1200', width: 1200, height: 1200 },
      { id: 'ad_320x50', label: '320 x 50', width: 320, height: 50 },
      { id: 'ad_720x90', label: '720 x 90', width: 720, height: 90 },
      { id: 'ad_728x90', label: '728 x 90', width: 728, height: 90 },
      { id: 'ad_320x100', label: '320 x 100', width: 320, height: 100 },
      { id: 'ad_970x250', label: '970 x 250', width: 970, height: 250 },
      { id: 'ad_980x250', label: '980 x 250', width: 980, height: 250 },
      { id: 'ad_990x250', label: '990 x 250', width: 990, height: 250 },
      { id: 'landscape_1200x628', label: '1200 x 628', width: 1200, height: 628 }
    ];

    const languages = [
      ['英语', 'English'], ['日语', '日本語'], ['简体中文', '简体中文'], ['繁体中文', '繁體中文'],
      ['越南语', 'Tiếng Việt'], ['泰语', 'ภาษาไทย'], ['韩语', '한국어'], ['印尼语', 'Indonesia'],
      ['马来语', 'Melayu']
    ];


    const LEGACY_TRADING_LOCALIZED_COPY = [
      { title: 'Headline Text', subtitle: 'More information and key features can be detailed here.', cta: 'Button Text' },
      { title: '主導権を握る', subtitle: 'Spec Marketsで取引コストを抑えましょう。', cta: '優位性を見つける' },
      { title: '掌控交易', subtitle: '使用 Spec Markets 降低您的交易成本。', cta: '找到你的优势' },
      { title: '掌控交易', subtitle: '使用 Spec Markets 降低您的交易成本。', cta: '找到你的優勢' },
      { title: 'Làm chủ giao dịch', subtitle: 'Giảm chi phí giao dịch cùng Spec Markets.', cta: 'Tìm lợi thế của bạn' },
      { title: 'ควบคุมการเทรด', subtitle: 'ลดต้นทุนการเทรดของคุณกับ Spec Markets', cta: 'ค้นหาจุดได้เปรียบ' },
      { title: '거래를 주도하세요', subtitle: 'Spec Markets와 함께 거래 비용을 낮추세요.', cta: '나만의 우위 찾기' },
      { title: 'Kendalikan trading', subtitle: 'Turunkan biaya trading Anda bersama Spec Markets.', cta: 'Temukan keunggulan Anda' },
      { title: 'Kuasai dagangan', subtitle: 'Kurangkan kos dagangan anda bersama Spec Markets.', cta: 'Cari kelebihan anda' }
    ];

    const localizedCopy = [
      { title: 'Headline Text', subtitle: 'More information and key features can be detailed here.', cta: 'Button Text' },
      { title: '見出しテキスト', subtitle: '詳細情報や主な機能をここに記載できます。', cta: 'ボタンテキスト' },
      { title: '标题文本', subtitle: '可在此处详细说明更多信息和主要功能。', cta: '按钮文本' },
      { title: '標題文字', subtitle: '可在此處詳細說明更多資訊和主要功能。', cta: '按鈕文字' },
      { title: 'Văn bản tiêu đề', subtitle: 'Có thể trình bày thêm thông tin và các tính năng chính tại đây.', cta: 'Văn bản nút' },
      { title: 'ข้อความหัวข้อ', subtitle: 'สามารถใส่ข้อมูลเพิ่มเติมและฟีเจอร์หลักได้ที่นี่', cta: 'ข้อความปุ่ม' },
      { title: '제목 텍스트', subtitle: '자세한 정보와 주요 기능을 여기에 설명할 수 있습니다.', cta: '버튼 텍스트' },
      { title: 'Teks Judul', subtitle: 'Informasi tambahan dan fitur utama dapat dijelaskan di sini.', cta: 'Teks Tombol' },
      { title: 'Teks Tajuk', subtitle: 'Maklumat lanjut dan ciri utama boleh diterangkan di sini.', cta: 'Teks Butang' }
    ];

    const TEMPLATE_PREVIEW_SIZE_ID = 'landscape_1200x628';
    const FIGMA_BUTTON_TEXT_COLOR = '#27376F';
    const FIGMA_BUTTON_FILL_COLOR = '#72DBF1';
    const LEGACY_BUTTON_TEXT_COLOR = '#ffffff';
    const LEGACY_BUTTON_FILL_COLORS = new Set(['#03b2cb', '#4ecbe3']);
    const INLINE_COPY_EDITOR_ENABLED = false;


    const defaultTemplateAnchors = {
      image: { x: 0, y: 0, w: 44.2, h: 100 },
      text: { x: 48.3, y: 30, w: 44, h: 28, align: 'left' },
      title: { x: 48.3, y: 30, w: 44, h: 12, align: 'left' },
      subtitle: { x: 48.3, y: 45, w: 44, h: 13, align: 'left' },
      cta: { x: 48.3, y: 66.8, w: 27, h: 11.5 },
      logo: { x: 48.3, y: 8, w: 24, h: 10 },
      trust: { x: 81, y: 87, w: 15, h: 8 }
    };

    const defaultTemplateStyles = {
      backgroundMode: 'solid',
      backgroundColor: '#dcf9ff',
      gradientStart: '#dcf9ff',
      gradientEnd: '#ffffff',
      gradientAngle: 135,
      textColor: '#081840',
      buttonColor: FIGMA_BUTTON_FILL_COLOR,
      buttonTextColor: FIGMA_BUTTON_TEXT_COLOR,
      logoVariant: 'black'
    };

    const darkTemplateStyles = {
      backgroundMode: 'gradient',
      backgroundColor: '#0E1D4C',
      gradientStart: '#0E1D4C',
      gradientEnd: '#2144B2',
      gradientAngle: 165,
      textColor: '#ffffff',
      buttonColor: FIGMA_BUTTON_FILL_COLOR,
      buttonTextColor: FIGMA_BUTTON_TEXT_COLOR,
      logoVariant: 'white'
    };


    window.SpecPromoDefaults = {
      materialSizes,
      languages,
      legacyTradingLocalizedCopy: LEGACY_TRADING_LOCALIZED_COPY,
      localizedCopy,
      templatePreviewSizeId: TEMPLATE_PREVIEW_SIZE_ID,
      figmaButtonTextColor: FIGMA_BUTTON_TEXT_COLOR,
      figmaButtonFillColor: FIGMA_BUTTON_FILL_COLOR,
      legacyButtonTextColor: LEGACY_BUTTON_TEXT_COLOR,
      legacyButtonFillColors: [...LEGACY_BUTTON_FILL_COLORS],
      inlineCopyEditorEnabled: INLINE_COPY_EDITOR_ENABLED,
      defaultTemplateAnchors,
      defaultTemplateStyles,
      darkTemplateStyles
    };
}());
