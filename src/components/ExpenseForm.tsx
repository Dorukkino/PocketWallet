import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus, Trash2, X } from 'lucide-react-native';

import { CATEGORY_COLORS, CURRENCIES } from '../constants/categories';
import { formatCurrencyValue } from '../lib/currency';
import type { CategoryName, ExchangeRates, ExpenseCategory } from '../types/budget';
import { CategoryIcon } from './CategoryIcon';

type Props = {
  categories: ExpenseCategory[];
  exchangeRates: ExchangeRates;
  defaultSpentOn: string;
  onAddExpense: (expense: {
    title: string;
    amount: number;
    category: CategoryName;
    spentOn: string;
  }) => Promise<void>;
  onAddCategory: (name: string, icon: string, color: string) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
};

const CATEGORY_ICON_OPTIONS = [
  'briefcase',
  'receipt',
  'shopping-cart',
  'shopping-bag',
  'home',
  'zap',
  'utensils',
  'coffee',
  'car',
  'fuel',
  'train',
  'plane',
  'gamepad',
  'ticket',
  'popcorn',
  'tv',
  'music',
  'book',
  'graduation',
  'shirt',
  'health',
  'stethoscope',
  'dumbbell',
  'smartphone',
  'laptop',
  'gift',
  'baby',
  'paw',
  'scissors',
  'wrench',
  'shield',
  'banknote',
];

export function ExpenseForm({
  categories,
  exchangeRates,
  defaultSpentOn,
  onAddExpense,
  onAddCategory,
  onDeleteCategory,
}: Props) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryName>(categories[0]?.name ?? 'Diğer');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('briefcase');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [spentOn, setSpentOn] = useState(defaultSpentOn);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const parsedPreviewAmount = Number(amount.replace(',', '.'));
  const canShowPreview = Number.isFinite(parsedPreviewAmount) && parsedPreviewAmount > 0;

  useEffect(() => {
    const selectedCategoryExists = categories.some((item) => item.name === category);
    if (!selectedCategoryExists && categories[0]) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  useEffect(() => {
    if (!title && !amount) {
      setSpentOn(defaultSpentOn);
    }
  }, [amount, defaultSpentOn, title]);

  const submit = async () => {
    const parsedAmount = Number(amount.replace(',', '.'));

    if (!title.trim()) {
      setError('Lütfen gider açıklaması yazın.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Lütfen sıfırdan büyük bir tutar girin.');
      return;
    }

    setIsSaving(true);
    setError('');
    await onAddExpense({
      title: title.trim(),
      amount: parsedAmount,
      category,
      spentOn: spentOn || defaultSpentOn,
    });
    setTitle('');
    setAmount('');
    setSpentOn(defaultSpentOn);
    setIsSaving(false);
  };

  const submitCategory = async () => {
    const normalizedName = newCategoryName.trim().replace(/\s+/g, ' ');
    const added = await onAddCategory(normalizedName, selectedIcon, selectedColor);
    if (added) {
      setCategory(normalizedName);
      setNewCategoryName('');
      setSelectedIcon('briefcase');
      setSelectedColor(CATEGORY_COLORS[0]);
      setIsCategoryModalVisible(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.titleIcon}>
          <Plus color="#34d399" size={18} />
        </View>
        <View>
          <Text style={styles.title}>Yeni Gider Ekle</Text>
          <Text style={styles.subtitle}>Harcamanı kaydet, bakiye anında güncellensin.</Text>
        </View>
      </View>

      {error ? <Text style={styles.errorBox}>{error}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.label}>Gider açıklaması</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Örn: market, fatura, sinema"
          placeholderTextColor="#475569"
          style={styles.input}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, styles.rowField]}>
          <Text style={styles.label}>Tutar (TRY)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="₺0.00"
            placeholderTextColor="#475569"
            style={styles.input}
          />
          {canShowPreview ? (
            <Text style={styles.conversionPreview}>
              {CURRENCIES.filter((item) => item.code !== 'TRY')
                .map((item) => formatCurrencyValue(parsedPreviewAmount, item.code, exchangeRates))
                .join('  ·  ')}
            </Text>
          ) : null}
        </View>

        <View style={[styles.field, styles.rowField]}>
          <Text style={styles.label}>Tarih</Text>
          <TextInput
            value={spentOn}
            onChangeText={setSpentOn}
            placeholder="YYYY-AA-GG"
            placeholderTextColor="#475569"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Kategori</Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const isSelected = category === item.name;
            return (
              <Pressable
                key={item.name}
                onPress={() => setCategory(item.name)}
                style={[
                  styles.categoryPill,
                  isSelected && {
                    backgroundColor: item.softColor,
                    borderColor: item.color,
                  },
                ]}
              >
                <CategoryIcon icon={item.icon} color={item.color} size={15} />
                <Text style={[styles.categoryText, isSelected && { color: '#f8fafc' }]}>{item.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.categoryManager}>
        <View style={styles.categoryManagerHeader}>
          <Text style={styles.label}>Kategori Yönetimi</Text>
          <Pressable onPress={() => setIsCategoryModalVisible(true)} style={styles.openModalButton}>
            <Plus color="#022c22" size={15} />
            <Text style={styles.openModalText}>Kategori Ekle</Text>
          </Pressable>
        </View>
        <View style={styles.manageList}>
          {categories.map((item) => (
            <View key={`manage-${item.id}`} style={styles.managePill}>
              <CategoryIcon icon={item.icon} color={item.color} size={14} />
              <Text style={styles.manageText}>{item.name}</Text>
              <Pressable onPress={() => onDeleteCategory(item.id)} hitSlop={8} style={styles.deleteCategoryButton}>
                <Trash2 color="#fb7185" size={14} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={isCategoryModalVisible}
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Yeni Kategori</Text>
                <Text style={styles.modalSubtitle}>Adını yaz, rengini ve giderine uygun ikonu seç.</Text>
              </View>
              <Pressable onPress={() => setIsCategoryModalVisible(false)} style={styles.modalCloseButton}>
                <X color="#94a3b8" size={18} />
              </Pressable>
            </View>

            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Örn: Kira, Sağlık, Evcil Hayvan"
              placeholderTextColor="#475569"
              style={styles.input}
            />

            <Text style={styles.iconPickerLabel}>Renk Seç</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={[styles.colorOption, isSelected && styles.colorOptionActive]}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.iconPickerLabel}>İkon Seç</Text>
            <ScrollView contentContainerStyle={styles.iconGrid} showsVerticalScrollIndicator={false}>
              {CATEGORY_ICON_OPTIONS.map((iconName) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <Pressable
                    key={iconName}
                    onPress={() => setSelectedIcon(iconName)}
                    style={[styles.iconOption, isSelected && { backgroundColor: selectedColor, borderColor: selectedColor }]}
                  >
                    <CategoryIcon icon={iconName} color={isSelected ? '#020617' : selectedColor} size={20} />
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={submitCategory} style={styles.modalSubmitButton}>
              <Text style={styles.modalSubmitText}>Kategoriyi Kaydet</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Pressable onPress={submit} disabled={isSaving} style={({ pressed }) => [styles.submit, pressed && styles.pressed]}>
        <Text style={styles.submitText}>{isSaving ? 'Kaydediliyor...' : 'Gider Ekle'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderColor: 'rgba(51, 65, 85, 0.78)',
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  titleIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(251, 113, 133, 0.24)',
    borderRadius: 14,
    borderWidth: 1,
    color: '#fb7185',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 14,
    padding: 12,
  },
  field: {
    gap: 7,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  conversionPreview: {
    color: '#5eead4',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  categoryText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  categoryManager: {
    gap: 8,
    marginBottom: 14,
  },
  categoryManagerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  openModalButton: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  openModalText: {
    color: '#022c22',
    fontSize: 11,
    fontWeight: '900',
  },
  manageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  managePill: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  manageText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
  deleteCategoryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(251, 113, 133, 0.1)',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: '84%',
    padding: 18,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 13,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  iconPickerLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  colorOptionActive: {
    borderColor: '#f8fafc',
    borderWidth: 2,
  },
  colorSwatch: {
    borderRadius: 999,
    height: 24,
    width: 24,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  iconOption: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  modalSubmitButton: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 17,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 15,
  },
  modalSubmitText: {
    color: '#022c22',
    fontSize: 14,
    fontWeight: '900',
  },
  submit: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 17,
    justifyContent: 'center',
    marginTop: 3,
    paddingVertical: 15,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  submitText: {
    color: '#022c22',
    fontSize: 14,
    fontWeight: '900',
  },
});
