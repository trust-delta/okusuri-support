interface SuccessResult<T> {
  isSuccess: true;
  data: T;
}

interface ErrorResult {
  isSuccess: false;
  errorMessage: string;
}

export type Result<S> = SuccessResult<S> | ErrorResult;

/**
 * 成功結果を作成するヘルパー関数
 */
export const success = <T>(data: T): SuccessResult<T> => ({
  isSuccess: true,
  data,
});

/**
 * エラー結果を作成するヘルパー関数
 */
export const error = (errorMessage: string): ErrorResult => ({
  isSuccess: false,
  errorMessage,
});
