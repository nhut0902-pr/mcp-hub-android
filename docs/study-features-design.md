# Thiết kế AI Gia sư và Flashcard

## Màn hình

| Màn hình | Nội dung chính | Thao tác một tay |
| --- | --- | --- |
| My Copilots | Thẻ **AI Gia sư** và **Flashcard AI** bên cạnh AI Math hiện có. | Chạm toàn bộ thẻ để mở. |
| AI Gia sư | Ô nhập đề bài, chọn mức giải thích, câu trả lời theo từng bước và nút tạo Flashcard từ lời giải. | Trả lời hiển thị trong một luồng cuộn; nút chính nằm dưới ô nhập. |
| Flashcard AI | Danh sách deck cục bộ, tạo deck từ tài liệu/chủ đề hoặc từ AI Gia sư. | Nút tạo deck ở đầu màn; deck gần hạn ôn ở đầu danh sách. |
| Tạo Flashcard | Chủ đề hoặc nội dung nguồn, số lượng thẻ, kết quả AI theo JSON đã kiểm tra trước khi lưu. | Một nút tạo rõ ràng; lỗi JSON được hiện thành thông báo dễ hiểu. |
| Phiên ôn | Mặt trước, chạm để lật, mặt sau và ba mức tự đánh giá. | Thẻ lớn giữa màn, ba nút đánh giá ở đáy. |

## Mô hình dữ liệu cục bộ

```ts
type StudyCard = {
  id: string;
  front: string;
  back: string;
  hint?: string;
  intervalDays: number;
  dueAt: number;
  reviewCount: number;
};

type StudyDeck = {
  id: string;
  title: string;
  source: string;
  createdAt: number;
  updatedAt: number;
  cards: StudyCard[];
};
```

Deck và trạng thái ôn được lưu qua AsyncStorage, không yêu cầu tài khoản hoặc đồng bộ đám mây. Khi chấm **Cần ôn lại**, thẻ quay lại hàng đợi sớm hơn; **Ổn** và **Đã thuộc** tăng khoảng cách ôn theo số lần ôn. Người dùng có thể xóa deck cục bộ từ màn danh sách.

## Luồng chính

> Người dùng nhập đề → AI Gia sư phân tích dữ kiện, lời giải, kiểm tra kết quả và mẹo nhớ → người dùng chọn “Tạo Flashcard” → ứng dụng yêu cầu AI trả JSON có schema hẹp → kiểm tra nội dung → lưu deck → mở phiên ôn.

AI Gia sư dùng Nhutbot 1.0 Flash nhưng không hứa hẹn tính chính xác tuyệt đối. Lời giải sẽ nhắc người dùng đối chiếu đề, đơn vị và kết quả; với bài kiểm tra quan trọng, cần xác minh lại với tài liệu/giáo viên.
