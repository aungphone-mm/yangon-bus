import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/transit_provider.dart';
import '../models/models.dart';

class StopSearchField extends StatefulWidget {
  final String label;
  final String hint;
  final Stop? selectedStop;
  final Color markerColor;
  final String markerLabel;
  final Function(Stop) onSelectStop;
  final VoidCallback? onClear;

  const StopSearchField({
    super.key,
    required this.label,
    required this.hint,
    this.selectedStop,
    required this.markerColor,
    required this.markerLabel,
    required this.onSelectStop,
    this.onClear,
  });

  @override
  State<StopSearchField> createState() => _StopSearchFieldState();
}

class _StopSearchFieldState extends State<StopSearchField> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;
  List<Stop> _results = [];

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    _removeOverlay();
    super.dispose();
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus) {
      _removeOverlay();
    }
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _search(String query) {
    if (query.isEmpty) {
      _removeOverlay();
      setState(() => _results = []);
      return;
    }

    final provider = context.read<TransitProvider>();
    final results = provider.searchStops(query, limit: 10);
    
    setState(() => _results = results);
    
    if (results.isNotEmpty) {
      _showOverlay();
    } else {
      _removeOverlay();
    }
  }

  void _showOverlay() {
    _removeOverlay();
    
    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        width: MediaQuery.of(context).size.width - 32 - 48, // Subtract padding and marker
        child: CompositedTransformFollower(
          link: _layerLink,
          offset: const Offset(0, 56),
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(12),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 300),
              child: ListView.builder(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                itemCount: _results.length,
                itemBuilder: (context, index) {
                  final stop = _results[index];
                  return ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      radius: 16,
                      backgroundColor: stop.isHub ? Colors.amber : Colors.grey[200],
                      child: stop.isHub 
                          ? const Text('H', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold))
                          : const Icon(Icons.location_on, size: 16),
                    ),
                    title: Text(stop.nameEn, maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(stop.townshipEn, style: const TextStyle(fontSize: 11)),
                    onTap: () {
                      widget.onSelectStop(stop);
                      _controller.clear();
                      _removeOverlay();
                      _focusNode.unfocus();
                    },
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
    
    Overlay.of(context).insert(_overlayEntry!);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.selectedStop != null) {
      // Show selected stop
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Color.alphaBlend(widget.markerColor.withAlpha(25), Colors.white),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Color.alphaBlend(widget.markerColor.withAlpha(76), Colors.white)),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: widget.markerColor,
              child: Text(
                widget.markerLabel,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.selectedStop!.nameEn,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    widget.selectedStop!.townshipEn,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: widget.onClear,
              iconSize: 20,
            ),
          ],
        ),
      );
    }

    // Show search field
    return Row(
      children: [
        CircleAvatar(
          radius: 16,
          backgroundColor: Color.alphaBlend(widget.markerColor.withAlpha(51), Colors.white),
          child: Text(
            widget.markerLabel,
            style: TextStyle(color: widget.markerColor, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: CompositedTransformTarget(
            link: _layerLink,
            child: TextField(
              controller: _controller,
              focusNode: _focusNode,
              decoration: InputDecoration(
                hintText: widget.hint,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                prefixIcon: const Icon(Icons.search, size: 20),
              ),
              onChanged: _search,
            ),
          ),
        ),
      ],
    );
  }
}
