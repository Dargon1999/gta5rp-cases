registerForm.addEventListener('submit', e => {
  e.preventDefault();

  const nickname = registerForm.nickname.value.trim();
  const discord = registerForm.discord.value.trim();
  const password = registerForm.password.value;
  const code = registerForm.code.value.trim();

  // Проверка регистрационного кода
  if (code !== 'gta5rp2025' && code !== 'admin_gta5rp2025') {
    alert('Ошибка: неверный регистрационный код!');
    return;
  }

  // Тут можно дальше добавлять логику регистрации (например, Firebase)
  alert('Регистрация успешна!');

  // Очистить форму или перейти на другую страницу
  registerForm.reset();
});
