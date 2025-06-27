/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const recordForm = document.getElementById('record-form') as HTMLFormElement;
    const dateInput = document.getElementById('date-input') as HTMLInputElement;
    const weightInput = document.getElementById('weight-input') as HTMLInputElement;
    const imageInput = document.getElementById('image-input') as HTMLInputElement;
    const recordsList = document.getElementById('records-list') as HTMLUListElement;
    
    const modal = document.getElementById('image-modal') as HTMLDivElement;
    const modalImage = document.getElementById('modal-image') as HTMLImageElement;
    const closeButton = document.querySelector('.close-button') as HTMLSpanElement;

    const recordsView = document.getElementById('records-view') as HTMLDivElement;
    const graphView = document.getElementById('graph-view') as HTMLDivElement;
    const recordsTab = document.getElementById('records-tab') as HTMLButtonElement;
    const graphTab = document.getElementById('graph-tab') as HTMLButtonElement;
    const graphContainer = document.getElementById('graph-container') as HTMLDivElement;

    const photoView = document.getElementById('photo-view') as HTMLDivElement;
    const photoTab = document.getElementById('photo-tab') as HTMLButtonElement;
    const photoGallery = document.getElementById('photo-gallery') as HTMLDivElement;
    
    // 編集機能のためのDOM要素
    const formTitle = document.getElementById('form-title') as HTMLHeadingElement;
    const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
    const cancelButton = document.getElementById('cancel-button') as HTMLButtonElement;

    // 型定義
    type Record = {
        date: string;
        weight: string;
        imageDataUrl: string | null;
    };

    // ローカルストレージからデータを読み込む
    let records: Record[] = JSON.parse(localStorage.getItem('lambRecords') || '[]');
    let currentlyEditingDate: string | null = null;

    // 画像ファイルをDataURLに変換する関数
    const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    // 記録リストを表示する関数
    const renderRecords = () => {
        recordsList.innerHTML = '';
        const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (sortedRecords.length === 0) {
            recordsList.innerHTML = '<li>まだ記録がありません。</li>';
            return;
        }

        sortedRecords.forEach((record) => {
            const li = document.createElement('li');
            li.dataset.date = record.date;
            
            const recordText = document.createElement('span');
            recordText.className = 'record-text';
            recordText.textContent = `${record.date} : ${record.weight} kg`;
            li.appendChild(recordText);

            if (record.imageDataUrl) {
                li.classList.add('has-image');
            }
            
            recordsList.appendChild(li);
        });
    };

    // 写真ギャラリーを表示する関数
    const renderPhotos = () => {
        photoGallery.innerHTML = '';
        const recordsWithPhotos = records.filter(r => r.imageDataUrl);
        const sortedRecords = [...recordsWithPhotos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (sortedRecords.length === 0) {
            photoGallery.innerHTML = '<p>まだ写真がありません。</p>';
            return;
        }

        sortedRecords.forEach(record => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            card.addEventListener('click', () => {
                modalImage.src = record.imageDataUrl!;
                modal.style.display = 'block';
            });

            const img = document.createElement('img');
            img.src = record.imageDataUrl!;
            img.alt = `${record.date} の写真`;

            const dateSpan = document.createElement('span');
            dateSpan.className = 'photo-date';
            dateSpan.textContent = record.date;
            
            card.appendChild(img);
            card.appendChild(dateSpan);
            photoGallery.appendChild(card);
        });
    };


    // グラフを描画する関数
    const renderGraph = () => {
        graphContainer.innerHTML = '';
        const sortedRecords = [...records]
            .filter(r => r.weight && !isNaN(parseFloat(r.weight)))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (sortedRecords.length < 2) {
            graphContainer.textContent = '記録が2つ以上になるとグラフが表示されます。';
            return;
        }

        const padding = { top: 20, right: 20, bottom: 40, left: 40 };
        const svgWidth = graphContainer.clientWidth;
        const svgHeight = 300;
        const chartWidth = svgWidth - padding.left - padding.right;
        const chartHeight = svgHeight - padding.top - padding.bottom;

        const weights = sortedRecords.map(r => parseFloat(r.weight));
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);
        const weightRange = maxWeight - minWeight;
        
        const yMin = Math.max(0, Math.floor(minWeight - weightRange * 0.2));
        const yMax = Math.ceil(maxWeight + weightRange * 0.2);

        const xScale = (index: number) => padding.left + (index / (sortedRecords.length - 1)) * chartWidth;
        const yScale = (weight: number) => padding.top + chartHeight - ((weight - yMin) / (yMax - yMin)) * chartHeight;

        let svg = `<svg width="${svgWidth}" height="${svgHeight}" aria-label="体重推移グラフ">`;

        for (let i = yMin; i <= yMax; i++) {
            if (i % 1 === 0 || yMax - yMin < 5) {
                const y = yScale(i);
                svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#eee" />`;
                svg += `<text x="${padding.left - 8}" y="${y}" text-anchor="end" alignment-baseline="middle" fill="#666">${i}</text>`;
            }
        }

        sortedRecords.forEach((record, index) => {
            if (sortedRecords.length <= 10 || index % Math.floor(sortedRecords.length / 10) === 0) {
                const x = xScale(index);
                const date = new Date(record.date);
                const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                svg += `<text x="${x}" y="${svgHeight - padding.bottom + 15}" text-anchor="middle" fill="#666">${formattedDate}</text>`;
            }
        });
        
        svg += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#ccc" />`;
        svg += `<line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#ccc" />`;

        const points = sortedRecords.map((r, i) => `${xScale(i)},${yScale(parseFloat(r.weight))}`).join(' ');
        svg += `<polyline points="${points}" fill="none" stroke="var(--primary-color)" stroke-width="2" />`;

        sortedRecords.forEach((r, i) => {
            svg += `<circle cx="${xScale(i)}" cy="${yScale(parseFloat(r.weight))}" r="4" fill="var(--primary-color)" />`;
        });
        
        svg += `</svg>`;
        graphContainer.innerHTML = svg;
    };

    const renderAllViews = () => {
        renderRecords();
        renderGraph();
        renderPhotos();
    }

    // フォーム送信時の処理
    recordForm.addEventListener('submit', async (e: Event) => {
        e.preventDefault();

        const date = dateInput.value;
        const weight = weightInput.value;
        const imageFile = imageInput.files ? imageInput.files[0] : null;
        
        if (!date || !weight) {
            alert('日付と体重は必須です。');
            return;
        }

        let imageDataUrl: string | null = null;
        if (imageFile) {
            try {
                imageDataUrl = await toBase64(imageFile);
            } catch (error) {
                console.error('画像処理中にエラーが発生しました:', error);
                alert('画像の処理に失敗しました。');
                return;
            }
        }
        
        if (currentlyEditingDate) {
            // 編集モード
            if (date !== currentlyEditingDate && records.some(r => r.date === date)) {
                alert('その日付の記録は既に存在します。別の日付を選択してください。');
                return;
            }
            const recordToUpdate = records.find(r => r.date === currentlyEditingDate);
            if (recordToUpdate) {
                recordToUpdate.date = date;
                recordToUpdate.weight = weight;
                // 新しい画像が提供された場合にのみ、imageDataUrlを更新する
                if (imageDataUrl) {
                    recordToUpdate.imageDataUrl = imageDataUrl;
                }
            }
        } else {
            // 追加モード
            const existingRecordIndex = records.findIndex(r => r.date === date);
            if (existingRecordIndex > -1) {
                records[existingRecordIndex].weight = weight;
                if (imageDataUrl) {
                    records[existingRecordIndex].imageDataUrl = imageDataUrl;
                }
            } else {
                const newRecord: Record = { date, weight, imageDataUrl };
                records.push(newRecord);
            }
        }

        try {
             localStorage.setItem('lambRecords', JSON.stringify(records));
        } catch (err) {
            console.error('Failed to save to localStorage:', err);
            alert('記録の保存に失敗しました。ストレージの空き容量が不足している可能性があります。');
        }

        renderAllViews();
        cancelEditing();
    });

    const startEditing = (date: string) => {
        const recordToEdit = records.find(r => r.date === date);
        if (!recordToEdit) return;

        currentlyEditingDate = date;
        
        dateInput.value = recordToEdit.date;
        weightInput.value = recordToEdit.weight;
        imageInput.value = ''; // ファイルインプットはリセット

        formTitle.textContent = '記録を編集';
        submitButton.innerHTML = '💾 記録を更新';
        cancelButton.classList.remove('hidden');

        recordForm.scrollIntoView({ behavior: 'smooth' });
    };

    const cancelEditing = () => {
        currentlyEditingDate = null;
        
        recordForm.reset();
        formTitle.textContent = '新しい記録を追加';
        submitButton.innerHTML = '🐾 記録を追加';
        cancelButton.classList.add('hidden');
    };

    recordsList.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const li = target.closest('li');
        if (li && li.dataset.date) {
            startEditing(li.dataset.date);
        }
    });

    cancelButton.addEventListener('click', cancelEditing);

    // モーダルを閉じる処理
    const closeModal = () => {
        modal.style.display = 'none';
        modalImage.src = ''; 
    };
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // タブ切り替え処理
    const switchTab = (tabToShow: 'records' | 'graph' | 'photo') => {
        recordsView.classList.remove('active');
        graphView.classList.remove('active');
        photoView.classList.remove('active');
        recordsTab.classList.remove('active');
        graphTab.classList.remove('active');
        photoTab.classList.remove('active');

        if (tabToShow === 'records') {
            recordsView.classList.add('active');
            recordsTab.classList.add('active');
        } else if (tabToShow === 'graph') {
            graphView.classList.add('active');
            graphTab.classList.add('active');
            renderGraph();
        } else if (tabToShow === 'photo') {
            photoView.classList.add('active');
            photoTab.classList.add('active');
            renderPhotos();
        }
    };

    recordsTab.addEventListener('click', () => switchTab('records'));
    graphTab.addEventListener('click', () => switchTab('graph'));
    photoTab.addEventListener('click', () => switchTab('photo'));


    // グラフのリサイズ対応
    let resizeTimer: number;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            if (graphView.classList.contains('active')) {
                renderGraph();
            }
        }, 250);
    });


    // 初期表示
    renderAllViews();
});