# Birthday Card

Thiệp sinh nhật tương tác theo phong cách vintage scrapbook, gồm trang mở đầu, menu ba bất ngờ, lá thư, bó hoa, bánh sinh nhật và album kỷ niệm.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở `http://127.0.0.1:5173/`.

Navbar ban đầu chỉ có **Bất ngờ**. Chọn mục nào trong trang Bất ngờ thì navbar mới thêm đúng mục đó; các mục đã mở được giữ khi quay lại trong lượt xem hiện tại. **Gallery ảnh** xuất hiện sau khi mở hộp quà kỷ niệm ở trang bánh sinh nhật, hoặc khi truy cập trực tiếp gallery.

Trang gallery ảnh: chọn **Gallery ảnh** trên thanh điều hướng, hoặc mở trực tiếp `http://127.0.0.1:5173/#gallery`. Collage phủ kín vùng nội dung trang, gồm ảnh chồng lớp với viền giấy xé và chữ **happy birthday** cắt ghép. Nhấn ảnh để xem lớn, dùng phím mũi tên hoặc vuốt để chuyển ảnh, nhấn Escape để đóng; có thể tải ảnh đang xem.

## Kiểm tra

```bash
npm run lint
npm run build
npm run test:e2e
```

Nội dung lời chúc, nhãn điều hướng và các ghi chú nằm trong `src/App.tsx`. Giao diện và chuyển động nằm trong `src/App.css`; ảnh minh họa nằm trong `src/assets`.
