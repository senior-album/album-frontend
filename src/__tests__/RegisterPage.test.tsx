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

  // ===== STEP 1: 역할 선택 =====
  describe('Step 1 - 역할 선택', () => {
    it('3가지 역할 선택지가 렌더링된다', () => {
      renderRegisterPage();
      expect(screen.getByText('시설 등록')).toBeTruthy();
      expect(screen.getByText('시설 직원')).toBeTruthy();
      expect(screen.getByText('보호자')).toBeTruthy();
    });

    it('시설 등록 클릭 시 Step 2로 이동하며 시설 정보 폼이 나타난다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('시설 등록'));
      expect(screen.getByText('시설 정보')).toBeTruthy();
      expect(screen.getByPlaceholderText('예: 행복요양원')).toBeTruthy();
    });

    it('시설 직원 클릭 시 Step 2로 이동하며 시설 코드 입력 폼이 나타난다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('시설 직원'));
      expect(screen.getByPlaceholderText('시설 관리자에게 받은 코드 (예: FAC-A1B2C3)')).toBeTruthy();
    });

    it('보호자 클릭 시 Step 2로 이동하며 입소자 이름 폼이 나타난다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('보호자'));
      expect(screen.getByPlaceholderText('어머님 또는 아버님 성함')).toBeTruthy();
    });

    it('로그인으로 돌아가기 링크가 존재한다', () => {
      renderRegisterPage();
      expect(screen.getByText('로그인으로 돌아가기')).toBeTruthy();
    });
  });

  // ===== STEP 2: 시설 관리자 가입 =====
  describe('Step 2 - 시설 관리자(admin) 가입', () => {
    const goToAdminForm = async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('시설 등록'));
    };

    it('시설 이름 없이 제출하면 에러가 표시된다', async () => {
      await goToAdminForm();
      await userEvent.type(screen.getByPlaceholderText('홍길동'), '관리자');
      await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'admin@test.com');
      await userEvent.type(screen.getByPlaceholderText('6자 이상'), 'password123');
      await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password123');

      await userEvent.click(screen.getByText('시설 등록 및 가입하기'));
      expect(screen.getByText('시설 이름을 입력해주세요.')).toBeTruthy();
    });

    it('시설 주소 없이 제출하면 에러가 표시된다', async () => {
      await goToAdminForm();
      await userEvent.type(screen.getByPlaceholderText('예: 행복요양원'), '테스트요양원');
      await userEvent.type(screen.getByPlaceholderText('홍길동'), '관리자');
      await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'admin@test.com');
      await userEvent.type(screen.getByPlaceholderText('6자 이상'), 'password123');
      await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password123');

      await userEvent.click(screen.getByText('시설 등록 및 가입하기'));
      expect(screen.getByText('시설 주소를 입력해주세요.')).toBeTruthy();
    });

    it('모든 필드 올바르게 입력 시 가입 성공 + 시설코드 발급', async () => {
      await goToAdminForm();
      await userEvent.type(screen.getByPlaceholderText('예: 행복요양원'), '테스트요양원');
      await userEvent.type(screen.getByPlaceholderText('서울시 강남구 테헤란로 123'), '서울시 종로구 1');
      await userEvent.type(screen.getByPlaceholderText('홍길동'), '관리자');
      await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'admin@test.com');
      await userEvent.type(screen.getByPlaceholderText('6자 이상'), 'password123');
      await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password123');

      await userEvent.click(screen.getByText('시설 등록 및 가입하기'));

      await waitFor(() => {
        const user = JSON.parse(localStorage.getItem('user')!);
        expect(user.isAdmin).toBe(true);
        expect(user.facility.name).toBe('테스트요양원');
        expect(user.facility.code).toMatch(/^FAC-/);

        const facility = JSON.parse(localStorage.getItem('facility')!);
        expect(facility.name).toBe('테스트요양원');
        expect(facility.code).toMatch(/^FAC-/);
      });
    });

    it('시설코드 발급 안내 메시지가 표시된다', async () => {
      await goToAdminForm();
      expect(screen.getByText(/가입 완료 후/)).toBeTruthy();
      expect(screen.getByText(/시설 코드/)).toBeTruthy();
    });
  });

  // ===== STEP 2: 시설 직원 가입 =====
  describe('Step 2 - 시설 직원(staff) 가입', () => {
    it('시설 코드 없이 제출하면 에러가 표시된다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('시설 직원'));
      await userEvent.type(screen.getByPlaceholderText('홍길동'), '직원');
      await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'staff@test.com');
      await userEvent.type(screen.getByPlaceholderText('6자 이상'), 'password123');
      await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password123');

      await userEvent.click(screen.getByText('가입하기'));
      expect(screen.getByText('시설 코드를 입력해주세요.')).toBeTruthy();
    });
  });

  // ===== STEP 2: 보호자 가입 =====
  describe('Step 2 - 보호자(guardian) 가입', () => {
    it('입소자 이름 없이 제출하면 에러가 표시된다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('보호자'));
      await userEvent.type(screen.getByPlaceholderText('홍길동'), '보호자');
      await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'guard@test.com');
      await userEvent.type(screen.getByPlaceholderText('시설에서 안내받은 코드 (예: FAC-A1B2C3)'), 'FAC-ABC');
      await userEvent.type(screen.getByPlaceholderText('6자 이상'), 'password123');
      await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password123');

      await userEvent.click(screen.getByText('가입하기'));
      expect(screen.getByText('입소자 이름을 입력해주세요.')).toBeTruthy();
    });

    it('시설 코드 없이 제출하면 에러가 표시된다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('보호자'));
      await userEvent.type(screen.getByPlaceholderText('홍길동'), '보호자');
      await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'guard@test.com');
      await userEvent.type(screen.getByPlaceholderText('어머님 또는 아버님 성함'), '김순자');
      await userEvent.type(screen.getByPlaceholderText('6자 이상'), 'password123');
      await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), 'password123');

      await userEvent.click(screen.getByText('가입하기'));
      expect(screen.getByText('시설 코드를 입력해주세요.')).toBeTruthy();
    });
  });

  // ===== 공통 유효성 검증 =====
  describe('공통 유효성 검증', () => {
    it('이메일 형식이 잘못되면 에러가 표시된다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('시설 직원'));
      await userEvent.type(screen.getByPlaceholderText('홍길동'), '테스트');
      await userEvent.type(screen.getByPlaceholderText('example@email.com'), 'bad-email');
      await userEvent.type(screen.getByPlaceholderText('6자 이상'), '123456');
      await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), '123456');
      await userEvent.type(screen.getByPlaceholderText('시설 관리자에게 받은 코드 (예: FAC-A1B2C3)'), 'FAC-X');

      await userEvent.click(screen.getByText('가입하기'));
      expect(screen.getByText('올바른 이메일 형식이 아닙니다.')).toBeTruthy();
    });

    it('비밀번호 불일치 시 에러가 표시된다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('시설 직원'));
      await userEvent.type(screen.getByPlaceholderText('홍길동'), '테스트');
      await userEvent.type(screen.getByPlaceholderText('example@email.com'), 't@t.com');
      await userEvent.type(screen.getByPlaceholderText('6자 이상'), '123456');
      await userEvent.type(screen.getByPlaceholderText('비밀번호를 다시 입력하세요'), '654321');
      await userEvent.type(screen.getByPlaceholderText('시설 관리자에게 받은 코드 (예: FAC-A1B2C3)'), 'FAC-X');

      await userEvent.click(screen.getByText('가입하기'));
      expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeTruthy();
    });

    it('역할 다시 선택하기 버튼으로 Step 1로 돌아간다', async () => {
      renderRegisterPage();
      await userEvent.click(screen.getByText('시설 직원'));
      // Step 2에 있는 상태
      expect(screen.getByPlaceholderText('홍길동')).toBeTruthy();

      await userEvent.click(screen.getByText('역할 다시 선택하기'));
      // Step 1로 돌아감
      expect(screen.getByText('시설 등록')).toBeTruthy();
      expect(screen.getByText('시설 직원')).toBeTruthy();
      expect(screen.getByText('보호자')).toBeTruthy();
    });
  });
});
