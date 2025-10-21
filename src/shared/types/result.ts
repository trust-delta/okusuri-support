interface SuccessResult<T> {
  isSuccess: true;
  data: T;
}

interface ErrorResult {
  isSuccess: false;
  errorMessage: string;
}

export type Result<S> = SuccessResult<S> | ErrorResult;
