function validateAndFixAiProfile(rawProfile: any): typeof DEFAULT_AI_PROFILE {
  const fixedProfile: any = { ...DEFAULT_AI_PROFILE };

  for (const key in DEFAULT_AI_PROFILE) {
    if (Object.prototype.hasOwnProperty.call(rawProfile, key)) {
      const value = rawProfile[key];

      // Специфичная валидация для некоторых полей
      switch (key) {
        case 'categories':
        case 'badges':
        case 'activityLast7Days':
        case 'emotionTimeline':
        case 'socialCircle':
        case 'aiAchievements':
        case 'timeInApp':
          fixedProfile[key] = Array.isArray(value) ? value : DEFAULT_AI_PROFILE[key];
          break;
        case 'avatarUrl':
          fixedProfile[key] = value === null || typeof value === 'string' ? value : null;
          break;
        case 'emotionLevel':
        case 'activityLevel':
        case 'aiSupportScore':
          fixedProfile[key] = typeof value === 'number' && value >= 0 && value <= 1 ? value : 0;
          break;
        case 'messagesCount':
          fixedProfile[key] = Number.isInteger(value) ? value : 0;
          break;
        case 'online':
          fixedProfile[key] = typeof value === 'boolean' ? value : false;
          break;
        default:
          fixedProfile[key] = value ?? DEFAULT_AI_PROFILE[key];
      }
    }
    // если поля нет, оставляем дефолт
  }

  return fixedProfile;
}
