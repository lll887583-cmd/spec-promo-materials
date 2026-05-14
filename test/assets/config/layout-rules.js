(function () {
  'use strict';

    const generationLayoutRules = {
      landscape_1200x628: {
        type: '横向主图',
        logo: { x: 6.5, y: 8, w: 24, h: 10 },
        text: { x: 6.5, y: 30, w: 44, h: 42, align: 'left' },
        image: { x: 55.8, y: 0, w: 44.2, h: 100 },
        trust: { x: 6.5, y: 87, w: 15, h: 8 },
        note: '基准横向海报，左右分区完整展示商品图与文案。'
      },
      square_1080x1080: {
        type: '方形',
        logo: { x: 8, y: 7, w: 34, h: 8 },
        text: { x: 8, y: 20, w: 84, h: 30, align: 'left' },
        image: { x: 0, y: 52, w: 100, h: 48 },
        trust: { x: 64, y: 43, w: 24, h: 7 },
        note: '方形布局改为上文案、下商品图，保证社媒信息流可读。'
      },
      portrait_1080x1350: {
        type: '竖向信息流',
        logo: { x: 8, y: 5, w: 38, h: 7 },
        text: { x: 8, y: 16, w: 84, h: 29, align: 'left' },
        image: { x: 0, y: 48, w: 100, h: 52 },
        trust: { x: 62, y: 40, w: 27, h: 6 },
        note: '竖向信息流上方优先放置品牌与 CTA，下方承载商品图。'
      },
      wide_1920x1080: {
        type: '宽屏横向',
        logo: { x: 6.5, y: 7, w: 24, h: 9 },
        text: { x: 6.5, y: 30, w: 43, h: 46, align: 'left' },
        image: { x: 55, y: 0, w: 45, h: 100 },
        trust: { x: 6.5, y: 84, w: 16, h: 7 },
        note: '16:9 宽屏强调左文案、右视觉，适配视频封面。'
      },
      story_1080x1920: {
        type: '竖屏 Story',
        logo: { x: 8, y: 5, w: 44, h: 6 },
        text: { x: 8, y: 14, w: 84, h: 27, align: 'left' },
        image: { x: 0, y: 45, w: 100, h: 55 },
        trust: { x: 58, y: 38, w: 30, h: 5 },
        note: 'Story 规格保留上方安全区，下半屏展示主体图层。'
      },
      reels_1080x1920: {
        type: '竖屏 Reels',
        logo: { x: 8, y: 6, w: 42, h: 6 },
        text: { x: 8, y: 18, w: 84, h: 25, align: 'left' },
        image: { x: 0, y: 48, w: 100, h: 52 },
        trust: { x: 58, y: 40, w: 30, h: 5 },
        note: 'Reels 规格避开顶部 UI 区，文案更靠中上。'
      },
      story_720x1280: {
        type: '竖屏',
        logo: { x: 8, y: 5, w: 44, h: 6 },
        text: { x: 8, y: 15, w: 84, h: 28, align: 'left' },
        image: { x: 0, y: 47, w: 100, h: 53 },
        trust: { x: 58, y: 39, w: 30, h: 5 },
        note: '小竖屏压缩文字区高度，保留核心识别元素。'
      },
      square_800x800: {
        type: '方形',
        logo: { x: 8, y: 7, w: 36, h: 8 },
        text: { x: 8, y: 21, w: 84, h: 29, align: 'left' },
        image: { x: 0, y: 54, w: 100, h: 46 },
        trust: { x: 64, y: 44, w: 24, h: 7 },
        note: '小方图减少文字占比，避免元素拥挤。'
      },
      landscape_1080x566: {
        type: '低高横图',
        logo: { x: 6, y: 7, w: 23, h: 10 },
        text: { x: 6, y: 28, w: 43, h: 48, align: 'left' },
        image: { x: 54, y: 0, w: 46, h: 100 },
        trust: { x: 6.5, y: 84, w: 16, h: 7 },
        note: '低高度横图减少上下留白，优先保证 CTA 出现。'
      },
      landscape_1024x768: {
        type: '4:3 横向',
        logo: { x: 7, y: 8, w: 28, h: 9 },
        text: { x: 7, y: 29, w: 44, h: 45, align: 'left' },
        image: { x: 55, y: 0, w: 45, h: 100 },
        trust: { x: 7, y: 84, w: 18, h: 7 },
        note: '4:3 比例增强文字区宽度，商品图靠右填充。'
      },
      banner_1366x768: {
        type: '桌面横幅',
        logo: { x: 6.5, y: 7, w: 24, h: 9 },
        text: { x: 6.5, y: 30, w: 42, h: 46, align: 'left' },
        image: { x: 55, y: 0, w: 45, h: 100 },
        trust: { x: 6.5, y: 84, w: 16, h: 7 },
        note: '桌面横幅保持左右分区，适合站内展示位。'
      },
      desktop_1440x900: {
        type: '桌面横幅',
        logo: { x: 7, y: 7, w: 25, h: 8 },
        text: { x: 7, y: 29, w: 42, h: 45, align: 'left' },
        image: { x: 54, y: 0, w: 46, h: 100 },
        trust: { x: 7, y: 84, w: 17, h: 7 },
        note: '桌面比例保留更多呼吸感，文案和商品图分离。'
      },
      desktop_1600x900: {
        type: '桌面 16:9',
        logo: { x: 6.5, y: 7, w: 24, h: 9 },
        text: { x: 6.5, y: 30, w: 42, h: 46, align: 'left' },
        image: { x: 55, y: 0, w: 45, h: 100 },
        trust: { x: 6.5, y: 84, w: 16, h: 7 },
        note: '16:9 展示屏布局，商品图占右侧主视觉。'
      },
      desktop_1680x1050: {
        type: '桌面宽屏',
        logo: { x: 7, y: 7, w: 25, h: 8 },
        text: { x: 7, y: 29, w: 42, h: 45, align: 'left' },
        image: { x: 54, y: 0, w: 46, h: 100 },
        trust: { x: 7, y: 84, w: 17, h: 7 },
        note: '宽屏办公比例，延续左右视觉骨架。'
      },
      qhd_2560x1440: {
        type: 'QHD 横向',
        logo: { x: 6.5, y: 7, w: 24, h: 9 },
        text: { x: 6.5, y: 30, w: 42, h: 46, align: 'left' },
        image: { x: 55, y: 0, w: 45, h: 100 },
        trust: { x: 6.5, y: 84, w: 16, h: 7 },
        note: '高分辨率按规则等比重排，保持视觉密度一致。'
      },
      hd_1280x720: {
        type: 'HD 横向',
        logo: { x: 6.5, y: 7, w: 24, h: 9 },
        text: { x: 6.5, y: 30, w: 42, h: 46, align: 'left' },
        image: { x: 55, y: 0, w: 45, h: 100 },
        trust: { x: 6.5, y: 84, w: 16, h: 7 },
        note: 'HD 输出适合视频封面和网页横幅。'
      },
      desktop_1536x864: {
        type: '桌面默认比例',
        logo: { x: 6.5, y: 7, w: 24, h: 9 },
        text: { x: 6.5, y: 30, w: 42, h: 46, align: 'left' },
        image: { x: 55, y: 0, w: 45, h: 100 },
        trust: { x: 6.5, y: 84, w: 16, h: 7 },
        note: '桌面默认比例，匹配预览区视觉密度。'
      }
    };

    Object.assign(generationLayoutRules, {
      ad_160x600: {
        type: '竖向摩天楼',
        logo: { x: 8, y: 4, w: 68, h: 6 },
        text: { x: 6, y: 14, w: 88, h: 25, align: 'left' },
        cta: { x: 8, y: 40, w: 72, h: 4.8 },
        image: { x: 0, y: 54, w: 100, h: 46 },
        trust: { x: 8, y: 47, w: 84, h: 5 },
        note: '160 x 600 按窄竖幅重排，上方保留 Logo 与文案，下方填充商品图。'
      },
      ad_320x100: {
        exact: true,
        type: 'Mobile banner',
        styles: { backgroundMode: 'solid', backgroundColor: '#DFF9FF' },
        image: { x: 68.4375, y: -9.8782, w: 31.584, h: 119.7571 },
        logo: { x: 5.9375, y: 9, w: 24.1934, h: 10.2193 },
        title: { x: 5.9375, y: 26, w: 59.0625, h: 14, align: 'left', font: 12, fontPx: 12 },
        subtitle: { x: 5.9375, y: 46, w: 59.0625, h: 20, align: 'left', font: 8, fontPx: 8 },
        cta: { x: 5.9375, y: 70, w: 20, h: 22, font: 7, fontPx: 7, padX: 3.75, padY: 6, lineHeight: 1.4 },
        trust: { hidden: true, x: 0, y: 0, w: 0, h: 0 },
        note: 'Figma 320 x 100 全局精确规则，参数与节点 2:249 对齐。'
      },
      ad_980x250: {
        exact: true,
        type: 'Billboard',
        styles: { backgroundMode: 'solid', backgroundColor: '#DFF9FF' },
        image: { x: 68.9796, y: -22, w: 31.0204, h: 144 },
        logo: { x: 5.3066, y: 10.401, w: 20.8991, h: 10.814 },
        title: { x: 5.3061, y: 29.6, w: 58.0612, h: 14.4, align: 'left', font: 12, fontPx: 30 },
        subtitle: { x: 5.3061, y: 50, w: 58.0612, h: 14.4, align: 'left', font: 8.8, fontPx: 22 },
        cta: { x: 5.3061, y: 71.6, w: 14.3878, h: 19.2, font: 6.8, fontPx: 17, padX: 2.2449, padY: 4.8, lineHeight: 1.4 },
        trust: { hidden: true, x: 0, y: 0, w: 0, h: 0 },
        note: 'Figma 980 x 250 全局精确规则，按钮字号/行高/内边距与节点 2:314 对齐。'
      },
      ad_300x600: {
        type: '半页竖幅',
        logo: { x: 8, y: 5, w: 48, h: 7 },
        text: { x: 8, y: 16, w: 84, h: 25, align: 'left' },
        cta: { x: 8, y: 42, w: 48, h: 6 },
        image: { x: 0, y: 56, w: 100, h: 44 },
        trust: { x: 58, y: 49, w: 30, h: 5 },
        note: '300 x 600 按半页广告重排，保证 CTA 与主体图上下分区。'
      },
      ad_990x250: {
        exact: true,
        type: 'Billboard',
        styles: { backgroundMode: 'solid', backgroundColor: '#DFF9FF' },
        image: { x: 69.2929, y: -22, w: 30.7071, h: 144 },
        logo: { x: 5.253, y: 10.401, w: 20.688, h: 10.814 },
        title: { x: 5.2525, y: 29.6, w: 57.4747, h: 14.4, align: 'left', font: 12, fontPx: 30 },
        subtitle: { x: 5.2525, y: 50, w: 57.4747, h: 14.4, align: 'left', font: 8.8, fontPx: 22 },
        cta: { x: 5.2525, y: 71.6, w: 14.2424, h: 19.2, font: 6.8, fontPx: 17, padX: 2.2222, padY: 4.8, lineHeight: 1.4 },
        trust: { hidden: true, x: 0, y: 0, w: 0, h: 0 },
        note: 'Figma 990 x 250 全局精确规则，按钮字号/行高/内边距与节点 2:321 对齐。'
      },
      ad_320x50: {
        type: '超窄移动横幅',
        logo: { x: 4, y: 12, w: 22, h: 24 },
        text: { x: 30, y: 12, w: 42, h: 60, align: 'left' },
        image: { x: 76, y: 0, w: 24, h: 100 },
        trust: { x: 52, y: 76, w: 20, h: 12 },
        note: '320 x 50 采用极简横幅规则，仅保留最关键品牌、标题和主体图。'
      },
      ad_320x480: {
        type: '移动竖幅',
        logo: { x: 8, y: 5, w: 48, h: 7 },
        text: { x: 8, y: 16, w: 84, h: 25, align: 'left' },
        cta: { x: 8, y: 42, w: 48, h: 6 },
        image: { x: 0, y: 56, w: 100, h: 44 },
        trust: { x: 58, y: 49, w: 30, h: 5 },
        note: '320 x 480 按移动竖幅规则，上方信息、下方商品图。'
      },
      ad_300x250: {
        type: '中矩形',
        logo: { x: 7, y: 7, w: 34, h: 8 },
        text: { x: 7, y: 21, w: 86, h: 32, align: 'left' },
        image: { x: 0, y: 58, w: 100, h: 42 },
        trust: { x: 62, y: 48, w: 26, h: 7 },
        note: '300 x 250 使用中矩形广告布局，文案与商品图上下分区。'
      },
      ad_970x250: {
        exact: true,
        type: 'Billboard',
        styles: { backgroundMode: 'solid', backgroundColor: '#DFF9FF' },
        image: { x: 68.6598, y: -22, w: 31.3402, h: 144 },
        logo: { x: 5.3613, y: 10.401, w: 21.1145, h: 10.814 },
        title: { x: 5.3608, y: 29.6, w: 58.6598, h: 14.4, align: 'left', font: 12, fontPx: 30 },
        subtitle: { x: 5.3608, y: 50, w: 58.6598, h: 14.4, align: 'left', font: 8.8, fontPx: 22 },
        cta: { x: 5.3608, y: 71.6, w: 14.5361, h: 19.2, font: 6.8, fontPx: 17, padX: 2.268, padY: 4.8, lineHeight: 1.4 },
        trust: { hidden: true, x: 0, y: 0, w: 0, h: 0 },
        note: 'Figma 970 x 250 全局精确规则，按钮字号/行高/内边距与节点 2:307 对齐。'
      },
      ad_1200x1500: {
        type: '竖向信息流',
        logo: { x: 8, y: 5, w: 38, h: 7 },
        text: { x: 8, y: 16, w: 84, h: 29, align: 'left' },
        image: { x: 0, y: 48, w: 100, h: 52 },
        trust: { x: 62, y: 40, w: 27, h: 6 },
        note: '1200 x 1500 按竖向信息流重排，适合高画幅输出。'
      },
      ad_1200x1200: {
        type: '方形',
        logo: { x: 8, y: 7, w: 34, h: 8 },
        text: { x: 8, y: 20, w: 84, h: 30, align: 'left' },
        image: { x: 0, y: 52, w: 100, h: 48 },
        trust: { x: 64, y: 43, w: 24, h: 7 },
        note: '1200 x 1200 使用方形广告布局，适配信息流与展示位。'
      },
      ad_120x600: {
        exact: true,
        type: 'Skyscraper',
        styles: { backgroundMode: 'solid', backgroundColor: '#DFF9FF' },
        image: { x: -32.9885, y: 60.6667, w: 165.977, h: 39.3334 },
        logo: { x: 6.4535, y: 5.9753, w: 87.0931, h: 2.2993 },
        title: { x: 6.6667, y: 17.8333, w: 86.6667, h: 9, align: 'left', font: 3, fontPx: 18 },
        subtitle: { x: 6.6667, y: 29, w: 86.6667, h: 12, align: 'left', font: 2, fontPx: 12 },
        cta: { x: 6.6667, y: 46.8446, w: 86.6667, h: 6.1667, font: 2, fontPx: 12, padX: 15, padY: 1.6667, lineHeight: 1.4 },
        trust: { hidden: true, x: 0, y: 0, w: 0, h: 0 },
        note: 'Figma 120 x 600 全局精确规则，参数与节点 2:240 对齐。'
      },
      ad_720x90: {
        type: '标准横幅',
        logo: { x: 4.5, y: 11, w: 20, h: 18 },
        text: { x: 29, y: 16, w: 43, h: 56, align: 'left' },
        image: { x: 76, y: 0, w: 24, h: 100 },
        trust: { x: 29, y: 74, w: 18, h: 12 },
        note: '720 x 90 按标准横幅输出，适合网页广告位。'
      },
      ad_728x90: {
        type: 'Leaderboard 横幅',
        logo: { x: 4.5, y: 11, w: 20, h: 18 },
        text: { x: 29, y: 16, w: 43, h: 56, align: 'left' },
        image: { x: 76, y: 0, w: 24, h: 100 },
        trust: { x: 29, y: 74, w: 18, h: 12 },
        note: '728 x 90 对齐 Leaderboard 广告，保持横向紧凑信息结构。'
      },
      ad_828x1200: {
        exact: true,
        type: 'Portrait feed',
        styles: { backgroundMode: 'solid', backgroundColor: '#DFF9FF' },
        image: { x: 0, y: 48.1667, w: 100, h: 81.7585 },
        logo: { x: 5.6763, y: 5.8333, w: 45.7941, h: 4.1709 },
        title: { x: 5.6763, y: 14.25, w: 88.5266, h: 5.6667, align: 'left', font: 4.75, fontPx: 57 },
        subtitle: { x: 5.6763, y: 23.9167, w: 87.0773, h: 6.6667, align: 'left', font: 2.75, fontPx: 33 },
        cta: { x: 5.6763, y: 37.4167, w: 30.314, h: 7.0833, font: 2.3333, fontPx: 28, padX: 5.5556, padY: 1.9167, lineHeight: 1.4 },
        trust: { hidden: true, x: 0, y: 0, w: 0, h: 0 },
        note: 'Figma 828 x 1200 全局精确规则，参数与节点 2:301 对齐。'
      }
    });



    window.SpecPromoLayoutRules = generationLayoutRules;
}());
