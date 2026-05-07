export function Login() {
  return (
    <form className="panel login-panel">
      <h2>Student login</h2>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" />
      </label>
      <label>
        Password
        <input type="password" name="password" autoComplete="current-password" />
      </label>
      <button type="button">Continue</button>
    </form>
  );
}
