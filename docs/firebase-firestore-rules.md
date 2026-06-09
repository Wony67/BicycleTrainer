# Firestore Rules

Firebase Console > Firestore Database > Rules에 아래 규칙을 적용하세요.

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

현재 앱은 아래 문서에 로컬 데이터를 백업합니다.

```txt
users/{uid}/appState/current
```

API 키는 클라우드에 저장하지 않습니다.
