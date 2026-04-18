import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import RegisterPage from '../pages/RegisterPage';

const renderRegisterPage = () => {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('페이지가 정상적으로 렌더링된다', () => {
    renderRegisterPage();
    expect(screen.getByText('회원가입')).toBeTruthy();
    expect(screen.getByText('시설 직원')).toBeTruthy();
    expect(screen.getByText('보호자')).toBeTruthy();
    expect(screen.getByPlaceholderText('홍길동')).toBeTruthy();
    expect(screen.getByPlaceholderText('example@email.com')).toBeTruthy();
  });

  it('역할 선택이 전환된다', async () => {
    renderRegisterPage();
    const guardianBtn = screen.getByText('👨‍👩‍👧 보호자');
    await userEvent.click(guardianBtn);
    // 보호자 선택 시 입소자 이름 필드가 나타남
    expect(screen.getByPlaceholderText('어머님 또는 아버님 성함')).toBeTruthy();
  });

  it('시설 직원 선택 시 시설 코드 필드가 나타난다', () => {
    renderRegisterPage();
    expect(screen.getByPlaceholderText('시설에서 제공받은 코드를 입력하세요')).toBeTruthy();
  });

  it('필수 입력값 없이 제출하면 에러 메시지가 표시된다', async () => {
    renderRegisterPage();
    const submitBtn = screen.getByText('가입하기');
    await userEvent.click(submitBtn);
    expect(screen.getByText('이름을 입력해주세요.')).toBeTruthy();
  });

  it('이메일 형식이 잘못되면 에러 메시지가 표시된다', async () => {
    renderRegisterPage();
    await userEvent.type(screen.getByPlaceholderText('홍길동'), '테스트');
    await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'invalid-email');
    await userEvent.type(screen.getByPlaceholderText('6자 이상'), '123456');
    await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), '123456');
    await userEvent.type(screen.getByPlaceholderText('시설에서 제공받은 코드를 입력하세요'), 'FAC001');

    const submitBtn = screen.getByText('가입하기');
    await userEvent.click(submitBtn);
    expect(screen.getByText('올바른 이메일 형식이 아닙니다.')).toBeTruthy();
  });

  it('비밀번호가 불일치하면 에러 메시지가 표시된다', async () => {
    renderRegisterPage();
    await userEvent.type(screen.getByPlaceholderText('홍길동'), '테스트');
    await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText('6자 이상'), '123456');
    await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), '654321');
    await userEvent.type(screen.getByPlaceholderText('시설에서 제공받은 코드를 입력하세요'), 'FAC001');

    const submitBtn = screen.getByText('가입하기');
    await userEvent.click(submitBtn);
    expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeTruthy();
  });

  it('비밀번호가 6자 미만이면 에러 메시지가 표시된다', async () => {
    renderRegisterPage();
    await userEvent.type(screen.getByPlaceholderText('홍길동'), '테스트');
    await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText('6자 이상'), '123');
    await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), '123');
    await userEvent.type(screen.getByPlaceholderText('시설에서 제공받은 코드를 입력하세요'), 'FAC001');

    const submitBtn = screen.getByText('가입하기');
    await userEvent.click(submitBtn);
    expect(screen.getByText('비밀번호는 6자 이상이어야 합니다.')).toBeTruthy();
  });

  it('모든 필드를 올바르게 입력하면 가입이 진행된다', async () => {
    renderRegisterPage();
    await userEvent.type(screen.getByPlaceholderText('홍길동'), '김철수');
    await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'kim@test.com');
    await userEvent.type(screen.getByPlaceholderText('010-1234-5678'), '01012345678');
    await userEvent.type(screen.getByPlaceholderText('6자 이상'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('시설에서 제공받은 코드를 입력하세요'), 'FAC001');

    const submitBtn = screen.getByText('가입하기');
    await userEvent.click(submitBtn);

    // 가입 성공 시 localStorage에 유저 정보가 저장됨
    await waitFor(() => {
      const stored = localStorage.getItem('user');
      expect(stored).toBeTruthy();
      const user = JSON.parse(stored!);
      expect(user.name).toBe('김철수');
      expect(user.role).toBe('staff');
    });
  });

  it('로그인 페이지로 돌아가는 링크가 동작한다', () => {
    renderRegisterPage();
    const backLink = screen.getByText('로그인으로 돌아가기');
    expect(backLink.closest('a')?.getAttribute('href')).toBe('/login');
  });
});
